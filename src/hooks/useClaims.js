import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { fromDb, toDb } from "../utils/claimUtils";
import { nowISO } from "../utils/dateUtils";
import { applyScheduleStatusEffects } from "../utils/scheduleStatusEffects";

export function useClaims(session, showNotice) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  // Undo queue: { id, type, payload, timer, onCommit }
  const [undoItem, setUndoItem] = useState(null);
  const pendingDeletes = useRef(new Map()); // id -> { claim, timer }
  const pendingStatusChanges = useRef(new Map()); // id -> { previousClaim, timer }

  const myEmail = session?.user?.email || "";
  const myId = session?.user?.id || null;

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("dosare").select("*").order("created_at", { ascending: false });
    if (error) {
      showNotice(error.message, "error");
      setClaims([]);
    } else {
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
      const isNewClaim = !claims.some((c) => c.id === claim.id);
      const payload = toDb({
        ...claim,
        createdBy: isNewClaim ? myId : claim.createdBy || myId,
        createdByEmail: isNewClaim ? myEmail : claim.createdByEmail || myEmail,
        updatedByEmail: myEmail,
      });
      const { error } = await supabase.from("dosare").upsert(payload);
      if (error) {
        showNotice(error.message, "error");
        return { success: false };
      }
      await loadAll();
      showNotice(isNewClaim ? "Dosarul a fost creat." : "Dosarul a fost salvat.", "success");
      return { success: true, openProgramator };
    },
    [claims, loadAll, myEmail, myId, showNotice]
  );

  /**
   * deleteClaim — soft delete cu undo 5 secunde.
   * Dosarul dispare imediat din UI, dar ștergerea din DB se face după timer.
   * Dacă user apasă Anulează, dosarul revine.
   */
  const deleteClaim = useCallback(
    (id, canEditFn, { onUndoToast } = {}) => {
      const target = claims.find((c) => c.id === id);
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
          showNotice(error.message, "error");
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
    [claims, showNotice]
  );

  const patchClaim = useCallback(
    async (id, patch, { canEditFn, skipOwnershipCheck = false } = {}) => {
      const current = claims.find((c) => c.id === id);
      if (!current) return false;
      if (!skipOwnershipCheck && canEditFn && !canEditFn(current)) {
        showNotice("Poți edita doar dosarele create de tine.", "error");
        return false;
      }
      let effectivePatch = { ...patch };
      const { patch: schedulePatch, notices: scheduleNotices } = applyScheduleStatusEffects(
        current,
        effectivePatch
      );
      effectivePatch = schedulePatch;
      scheduleNotices.forEach((msg) => showNotice(msg, "success"));

      const updated = { ...current, ...effectivePatch, dataUltimeiActualizari: nowISO(), updatedByEmail: myEmail };
      const { error } = await supabase.from("dosare").update(toDb(updated)).eq("id", id);
      if (error) {
        showNotice(error.message, "error");
        await loadAll();
        return false;
      }
      setClaims((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return true;
    },
    [claims, loadAll, myEmail, showNotice]
  );

  /**
   * moveToStatus — schimbă statusul cu undo 5 secunde.
   * Statusul se schimbă imediat în UI, DB-ul se actualizează după timer.
   * Dacă user apasă Anulează, statusul anterior este restaurat.
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

      const deliveryPatch =
        newStatusKey === "gata_de_ridicare"
          ? { gataDeRidicare: true, dataGataRidicare: claim.dataGataRidicare || changedAt, ridicata: false, dataRidicare: null }
          : newStatusKey === "predat_client"
          ? { gataDeRidicare: true, dataGataRidicare: claim.dataGataRidicare || changedAt, ridicata: true, dataRidicare: claim.dataRidicare || changedAt }
          : ["gata_de_ridicare", "predat_client"].includes(claim.status) && newStatusKey !== "facturat"
          ? { gataDeRidicare: false, dataGataRidicare: null, ridicata: false, dataRidicare: null }
          : {};

      const isPreProgramat = ["deschidere", "reconstatare", "accept_plata", "piese_comandate", "primit", "cerere_reparatie"].includes(newStatusKey);
      const schedulePatch = isPreProgramat
        ? { dataProgramare: null, pieseSosite: newStatusKey === "piese_comandate" ? !!claim.pieseSosite : false }
        : {};

      const updated = {
        ...claim,
        ...deliveryPatch,
        ...schedulePatch,
        status: newStatusKey,
        dataSchimbareStatus: changedAt,
        dataUltimeiActualizari: changedAt,
        updatedByEmail: myEmail,
      };

      // Apply immediately to UI
      setClaims((prev) => prev.map((c) => (c.id === claim.id ? updated : c)));

      const clearPendingTimer = () => {
        const existing = pendingStatusChanges.current.get(claim.id);
        if (existing?.timer) clearTimeout(existing.timer);
      };

      const commitStatus = async () => {
        if (!pendingStatusChanges.current.has(claim.id)) return;
        clearPendingTimer();
        pendingStatusChanges.current.delete(claim.id);
        const { error } = await supabase.from("dosare").upsert(toDb(updated));
        if (error) {
          showNotice(error.message, "error");
          // Rollback
          setClaims((prev) => prev.map((c) => (c.id === claim.id ? previousClaim : c)));
        }
      };

      const undoStatus = () => {
        if (!pendingStatusChanges.current.has(claim.id)) return;
        clearPendingTimer();
        pendingStatusChanges.current.delete(claim.id);
        setClaims((prev) => prev.map((c) => (c.id === claim.id ? previousClaim : c)));
        showNotice(`Status restaurat la „${previousClaim.status}".`, "success");
      };

      clearPendingTimer();
      const timer = setTimeout(() => {
        commitStatus();
      }, 5000);
      pendingStatusChanges.current.set(claim.id, { previousClaim, updated, commitStatus, undoStatus, timer });

      // Notify parent for undo toast
      const STATUSES_LABELS = {
        deschidere: "Acord intrare",
        reconstatare: "Reconstatare",
        accept_plata: "Accept de plată",
        piese_comandate: "Piese comandate",
        programat: "Programat",
        in_lucru: "În lucru",
        gata_de_ridicare: "Gata de ridicare",
        predat_client: "Predat client",
        facturat: "Facturat",
      };

      onUndoToast?.({
        id: `status_${claim.id}`,
        icon: "status",
        message: `„${claim.numarDosar || claim.numarInmatriculare}" → ${STATUSES_LABELS[newStatusKey] || newStatusKey}`,
        timeoutMs: 5000,
        onCommit: commitStatus,
        onUndo: undoStatus,
      });

      return true;
    },
    [myEmail, showNotice]
  );

  return {
    claims,
    loading,
    loadAll,
    saveClaim,
    deleteClaim,
    patchClaim,
    moveToStatus,
    undoItem,
    setUndoItem,
  };
}
