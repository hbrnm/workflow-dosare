import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
  fromDb,
  toDb,
  toDbPatch,
  writeDosarWithSchemaCompat,
  hasMediaOps,
  resolveMediaPatch,
  stripMediaOps,
  unionMediaLists,
} from "../utils/claimUtils";
import { nowISO } from "../utils/dateUtils";
import { applyScheduleStatusEffects } from "../utils/scheduleStatusEffects";
import { getStatusAlertDays, getStatusDefinition } from "../constants/config";
import {
  findCoScheduleSiblings,
  normalizePlate,
  isValidPlateKey,
} from "../utils/plateSchedule";

export function useClaims(session, showNotice) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Undo queue: { id, type, payload, timer, onCommit }
  const [undoItem, setUndoItem] = useState(null);
  const pendingDeletes = useRef(new Map()); // id -> { claim, timer }
  const pendingStatusChanges = useRef(new Map()); // id -> { previousClaim, timer }
  const claimsRef = useRef([]);
  const claimWriteQueues = useRef(new Map()); // id -> Promise chain (serialize media writes)
  const patchClaimRef = useRef(null);

  claimsRef.current = claims;

  const myEmail = session?.user?.email || "";
  const myId = session?.user?.id || null;

  const enqueueClaimWrite = useCallback((id, task) => {
    const prev = claimWriteQueues.current.get(id) || Promise.resolve();
    const run = prev.catch(() => {}).then(task);
    claimWriteQueues.current.set(
      id,
      run.catch(() => {})
    );
    return run;
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setLoadError({ message: "Ești offline.", offline: true });
      setLoading(false);
      showNotice?.("Ești offline — verifică conexiunea.", "error", {
        actionLabel: "Reîncearcă",
        onAction: () => loadAll(),
        timeout: 8000,
      });
      return;
    }

    const { data, error } = await supabase.from("dosare").select("*").order("created_at", { ascending: false });
    if (error) {
      const message = error.message || "Nu am putut încărca dosarele.";
      setLoadError({ message, offline: false });
      // Keep previous claims if we already had some — avoid fake empty workspace
      if (!claimsRef.current.length) setClaims([]);
      showNotice?.(message, "error", {
        actionLabel: "Reîncearcă",
        onAction: () => loadAll(),
        timeout: 8000,
      });
    } else {
      setLoadError(null);
      // Filter out pending-delete claims from display
      const pendingDeleteIds = new Set(pendingDeletes.current.keys());
      setClaims((data || []).map(fromDb).filter((c) => !pendingDeleteIds.has(c.id)));
    }
    setLoading(false);
  }, [showNotice]);

  // Real-time subscription
  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel("public:dosare_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "dosare" }, () => {
        // Don't reload if we have pending undo operations — avoid flickering
        const hasPending = pendingDeletes.current.size > 0 || pendingStatusChanges.current.size > 0;
        if (!hasPending) loadAll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  const saveClaim = useCallback(
    async (claim, { openProgramator = false } = {}) => {
      const isNewClaim = !claimsRef.current.some((c) => c.id === claim.id);
      const live = claimsRef.current.find((c) => c.id === claim.id);
      // Union media so a full save does not wipe concurrent QuickCapture uploads
      const claimToSave = live
        ? {
            ...claim,
            poze: unionMediaLists(claim.poze, live.poze),
            documente: unionMediaLists(claim.documente, live.documente),
          }
        : claim;
      const prevDate = live?.dataProgramare || null;
      const nextDate = claimToSave.dataProgramare || null;
      const scheduleChanged = String(prevDate || "") !== String(nextDate || "");

      const payload = toDb({
        ...claimToSave,
        createdBy: isNewClaim ? myId : claimToSave.createdBy || myId,
        createdByEmail: isNewClaim ? myEmail : claimToSave.createdByEmail || myEmail,
        updatedByEmail: myEmail,
      });
      const { error } = await writeDosarWithSchemaCompat(supabase, "upsert", payload);
      if (error) {
        showNotice(error.message, "error");
        return { success: false };
      }
      await loadAll();

      // After modal save, align sibling dosare pe aceeași mașină
      if (scheduleChanged && isValidPlateKey(normalizePlate(claimToSave.numarInmatriculare))) {
        const siblings = findCoScheduleSiblings(claimsRef.current, claimToSave, {
          mode: nextDate ? "set" : "clear",
          previousDate: prevDate,
        });
        let cascaded = 0;
        for (const sib of siblings) {
          if (nextDate && String(sib.dataProgramare || "") === String(nextDate)) continue;
          if (!nextDate && !sib.dataProgramare) continue;
          const ok = await patchClaimRef.current?.(sib.id, {
            dataProgramare: nextDate,
            programareStatus: null,
          }, { skipSiblingCascade: true, skipOwnershipCheck: true, quiet: true });
          if (ok) cascaded += 1;
        }
        if (cascaded > 0) {
          const plate = normalizePlate(claimToSave.numarInmatriculare);
          showNotice(
            nextDate
              ? `Programat și ${cascaded} dosar${cascaded > 1 ? "e" : ""} pe ${plate}.`
              : `Programare anulată și pe ${cascaded} dosar${cascaded > 1 ? "e" : ""} pe ${plate}.`,
            "success"
          );
        }
      }

      showNotice(isNewClaim ? "Dosarul a fost creat." : "Dosarul a fost salvat.", "success");
      return { success: true, openProgramator };
    },
    [loadAll, myEmail, myId, showNotice]
  );

  /**
   * deleteClaim — soft delete cu undo 5 secunde.
   * Dosarul dispare imediat din UI, dar ștergerea din DB se face după timer.
   * Dacă user apasă Anulează, dosarul revine.
   */
  const deleteClaim = useCallback(
    (id, canEditFn, { onUndoToast } = {}) => {
      const target = claimsRef.current.find((c) => c.id === id);
      if (!target) return;
      if (canEditFn && !canEditFn(target)) {
        showNotice("Poți șterge doar dosarele create de tine.", "error");
        return;
      }

      // Remove from UI immediately
      setClaims((prev) => prev.filter((c) => c.id !== id));

      const clearPendingTimer = () => {
        const existing = pendingDeletes.current.get(id);
        if (existing?.timer) clearTimeout(existing.timer);
      };

      const commitDelete = async () => {
        // Idempotent — toast + timer pot apela ambele
        if (!pendingDeletes.current.has(id)) return;
        clearPendingTimer();
        pendingDeletes.current.delete(id);
        const { error } = await supabase.rpc("delete_dosar_with_archive", { p_dosar_id: id });
        if (error) {
          const raw = error.message || "";
          const friendly = /foreign key|update or delete on table/i.test(raw)
            ? "Nu am putut șterge dosarul (legate de istoric). Rulează migrarea 28 în Supabase, apoi reîncearcă."
            : raw || "Eroare la ștergerea dosarului.";
          showNotice(friendly, "error");
          // Restore on error
          setClaims((prev) => {
            const already = prev.some((c) => c.id === id);
            return already ? prev : [target, ...prev];
          });
        }
      };

      const undoDelete = () => {
        if (!pendingDeletes.current.has(id)) return;
        clearPendingTimer();
        pendingDeletes.current.delete(id);
        // Restore claim to UI
        setClaims((prev) => {
          const already = prev.some((c) => c.id === id);
          return already ? prev : [target, ...prev];
        });
        showNotice(`Dosarul „${target.numarDosar || target.numarInmatriculare}" a fost restaurat.`, "success");
      };

      clearPendingTimer();
      const timer = setTimeout(() => {
        commitDelete();
      }, 5000);
      pendingDeletes.current.set(id, { claim: target, commitDelete, undoDelete, timer });

      // Signal parent to show undo toast
      onUndoToast?.({
        id,
        icon: "delete",
        message: `Dosarul „${target.numarDosar || target.numarInmatriculare}" a fost șters.`,
        timeoutMs: 5000,
        onCommit: commitDelete,
        onUndo: undoDelete,
      });
    },
    [showNotice]
  );

  const patchClaim = useCallback(
    async (id, patch, { canEditFn, skipOwnershipCheck = false, skipSiblingCascade = false, quiet = false } = {}) => {
      const run = async () => {
        const current = claimsRef.current.find((c) => c.id === id);
        if (!current) return false;
        if (!skipOwnershipCheck && canEditFn && !canEditFn(current)) {
          showNotice("Poți edita doar dosarele create de tine.", "error");
          return false;
        }

        const mediaResolved = resolveMediaPatch(current, patch);
        let effectivePatch = { ...stripMediaOps(patch), ...mediaResolved };

        const { patch: schedulePatch, notices: scheduleNotices } = applyScheduleStatusEffects(
          current,
          effectivePatch
        );
        effectivePatch = schedulePatch;
        if (!quiet) {
          scheduleNotices.forEach((msg) => showNotice(msg, "success"));
        }

        const nextStatus = effectivePatch.status ?? current.status;
        if (nextStatus !== current.status) {
          effectivePatch = {
            ...effectivePatch,
            alerteAck: false,
            dataSchimbareStatus: effectivePatch.dataSchimbareStatus || nowISO(),
            termenAlertaZile:
              effectivePatch.termenAlertaZile ?? getStatusAlertDays(nextStatus),
          };
        }

        const updated = {
          ...current,
          ...effectivePatch,
          dataUltimeiActualizari: nowISO(),
          updatedByEmail: myEmail,
        };
        // Optimistic UI — rollback on error (same pattern as moveToStatus)
        setClaims((prev) => prev.map((c) => (c.id === id ? updated : c)));
        const patchPayload = toDbPatch(current, effectivePatch, { updatedByEmail: myEmail });
        const { error } = await writeDosarWithSchemaCompat(supabase, "update", patchPayload, { id });
        if (error) {
          showNotice(error.message, "error");
          setClaims((prev) => prev.map((c) => (c.id === id ? current : c)));
          return false;
        }

        // Co-programează celelalte dosare pe aceeași mașină (aceeași dată/oră)
        if (
          !skipSiblingCascade &&
          Object.prototype.hasOwnProperty.call(patch, "dataProgramare")
        ) {
          const nextDate = patch.dataProgramare || null;
          const siblings = findCoScheduleSiblings(claimsRef.current, current, {
            mode: nextDate ? "set" : "clear",
            previousDate: current.dataProgramare,
          }).filter((sib) => sib.id !== id);

          let cascaded = 0;
          for (const sib of siblings) {
            if (!skipOwnershipCheck && canEditFn && !canEditFn(sib)) continue;
            if (nextDate && String(sib.dataProgramare || "") === String(nextDate)) continue;
            if (!nextDate && !sib.dataProgramare) continue;
            const ok = await patchClaimRef.current?.(
              sib.id,
              { dataProgramare: nextDate, programareStatus: null },
              { canEditFn, skipOwnershipCheck, skipSiblingCascade: true, quiet: true }
            );
            if (ok) cascaded += 1;
          }
          if (cascaded > 0) {
            const plate = normalizePlate(current.numarInmatriculare);
            showNotice(
              nextDate
                ? `Programat și ${cascaded} dosar${cascaded > 1 ? "e" : ""} pe ${plate}.`
                : `Programare anulată și pe ${cascaded} dosar${cascaded > 1 ? "e" : ""} pe ${plate}.`,
              "success"
            );
          }
        }

        return true;
      };

      if (hasMediaOps(patch)) {
        return enqueueClaimWrite(id, run);
      }
      return run();
    },
    [enqueueClaimWrite, loadAll, myEmail, showNotice]
  );

  patchClaimRef.current = patchClaim;

  /**
   * moveToStatus — schimbă statusul cu undo 5 secunde.
   * Statusul se schimbă imediat în UI; DB primește doar un patch țintit (fără poze/documente).
   */
  const moveToStatus = useCallback(
    (claim, newStatusKey, canEditFn, { onUndoToast } = {}) => {
      if (canEditFn && !canEditFn(claim)) {
        showNotice("Poți muta doar dosarele create de tine.", "error");
        return false;
      }
      if (claim.status === newStatusKey) return false;

      const previousClaim = { ...claim };
      const changedAt = nowISO();

      const deliveryPatch = {};

      const mappedKey = getStatusDefinition(newStatusKey).key;
      const isPreProgramat = ["deschidere", "piese_comandate"].includes(mappedKey);
      const schedulePatch = isPreProgramat
        ? { dataProgramare: null, pieseSosite: mappedKey === "piese_comandate" ? !!claim.pieseSosite : false }
        : {};

      const statusPatch = {
        ...deliveryPatch,
        ...schedulePatch,
        status: mappedKey,
        termenAlertaZile: getStatusAlertDays(mappedKey),
        dataSchimbareStatus: changedAt,
        alerteAck: false,
      };

      const updated = {
        ...claim,
        ...statusPatch,
        dataUltimeiActualizari: changedAt,
        updatedByEmail: myEmail,
      };

      // Apply immediately to UI
      setClaims((prev) => prev.map((c) => (c.id === claim.id ? updated : c)));

      const clearPendingTimer = () => {
        const existing = pendingStatusChanges.current.get(claim.id);
        if (existing?.timer) clearTimeout(existing.timer);
      };

      clearPendingTimer();
      pendingStatusChanges.current.delete(claim.id);
      void (async () => {
        const patchPayload = toDbPatch(claim, statusPatch, { updatedByEmail: myEmail });
        const { error } = await writeDosarWithSchemaCompat(supabase, "update", patchPayload, {
          id: claim.id,
        });
        if (error) {
          showNotice(error.message, "error");
          setClaims((prev) => prev.map((c) => (c.id === claim.id ? previousClaim : c)));
        }
      })();

      const undoStatus = () => {
        if (!pendingStatusChanges.current.has(claim.id)) return;
        clearPendingTimer();
        pendingStatusChanges.current.delete(claim.id);
        setClaims((prev) => prev.map((c) => (c.id === claim.id ? previousClaim : c)));
        void (async () => {
          const undoPatch = {
            status: previousClaim.status,
            termenAlertaZile: previousClaim.termenAlertaZile,
            dataSchimbareStatus: previousClaim.dataSchimbareStatus,
            alerteAck: previousClaim.alerteAck,
            gataDeRidicare: previousClaim.gataDeRidicare,
            dataGataRidicare: previousClaim.dataGataRidicare,
            ridicata: previousClaim.ridicata,
            dataRidicare: previousClaim.dataRidicare,
            dataProgramare: previousClaim.dataProgramare,
            pieseSosite: previousClaim.pieseSosite,
          };
          const patchPayload = toDbPatch(updated, undoPatch, { updatedByEmail: myEmail });
          const { error } = await writeDosarWithSchemaCompat(supabase, "update", patchPayload, {
            id: claim.id,
          });
          if (error) showNotice(error.message, "error");
          else showNotice(`Status restaurat la „${previousClaim.status}".`, "success");
        })();
      };

      pendingStatusChanges.current.set(claim.id, { previousClaim, updated, undoStatus, timer: null });

      // Notify parent for undo toast
      const STATUSES_LABELS = {
        deschidere: "AIR",
        piese_comandate: "Piese",
        programat: "Programări",
        in_lucru: "Reparație",
        accept_plata: "Accept plată",
        facturat: "Facturat",
      };

      onUndoToast?.({
        id: `status_${claim.id}`,
        icon: "status",
        message: `„${claim.numarDosar || claim.numarInmatriculare}" → ${STATUSES_LABELS[mappedKey] || mappedKey}`,
        timeoutMs: 5000,
        onCommit: () => {},
        onUndo: undoStatus,
      });

      return true;
    },
    [myEmail, showNotice]
  );

  return {
    claims,
    loading,
    loadError,
    loadAll,
    saveClaim,
    deleteClaim,
    patchClaim,
    moveToStatus,
    undoItem,
    setUndoItem,
  };
}
