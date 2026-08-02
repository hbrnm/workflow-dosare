import { useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { fromDb, toDb } from "../utils/claimUtils";
import { nowISO } from "../utils/dateUtils";

export function useClaims(session, showNotice) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const myEmail = session?.user?.email || "";
  const myId = session?.user?.id || null;

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("dosare").select("*").order("created_at", { ascending: false });
    if (error) {
      showNotice(error.message, "error");
      setClaims([]);
    } else {
      setClaims((data || []).map(fromDb));
    }
    setLoading(false);
  }, [showNotice]);

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

  const deleteClaim = useCallback(
    async (id, canEditFn) => {
      const target = claims.find((c) => c.id === id);
      if (target && canEditFn && !canEditFn(target)) {
        showNotice("Poți șterge doar dosarele create de tine.", "error");
        return false;
      }
      const { error } = await supabase.from("dosare").delete().eq("id", id);
      if (error) {
        showNotice(error.message, "error");
        return false;
      }
      await loadAll();
      showNotice("Dosarul a fost șters.", "success");
      return true;
    },
    [claims, loadAll, showNotice]
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
      if (patch.dataProgramare && current.status === "piese_sosite") {
        effectivePatch = { ...effectivePatch, status: "programat", dataSchimbareStatus: nowISO() };
        showNotice('Dosar mutat automat în „Programat".', "success");
      }
      const updated = { ...current, ...effectivePatch, dataUltimeiActualizari: nowISO(), updatedByEmail: myEmail };
      const { error } = await supabase.from("dosare").upsert(toDb(updated));
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

  const moveToStatus = useCallback(
    async (claim, newStatusKey, canEditFn) => {
      if (canEditFn && !canEditFn(claim)) {
        showNotice("Poți muta doar dosarele create de tine.", "error");
        return false;
      }
      if (claim.status === newStatusKey) return false;
      const changedAt = nowISO();
      const deliveryPatch = newStatusKey === "gata_de_ridicare"
        ? { gataDeRidicare: true, dataGataRidicare: claim.dataGataRidicare || changedAt, ridicata: false, dataRidicare: null }
        : newStatusKey === "predat_client"
        ? { gataDeRidicare: true, dataGataRidicare: claim.dataGataRidicare || changedAt, ridicata: true, dataRidicare: claim.dataRidicare || changedAt }
        : ["gata_de_ridicare", "predat_client"].includes(claim.status) && newStatusKey !== "facturat"
        ? { gataDeRidicare: false, dataGataRidicare: null, ridicata: false, dataRidicare: null }
        : {};
      const updated = { ...claim, ...deliveryPatch, status: newStatusKey, dataSchimbareStatus: changedAt, dataUltimeiActualizari: changedAt, updatedByEmail: myEmail };
      setClaims((prev) => prev.map((c) => (c.id === claim.id ? updated : c)));
      const { error } = await supabase.from("dosare").upsert(toDb(updated));
      if (error) {
        showNotice(error.message, "error");
        await loadAll();
        return false;
      }
      return true;
    },
    [loadAll, myEmail, showNotice]
  );

  return {
    claims,
    loading,
    setClaims,
    loadAll,
    saveClaim,
    deleteClaim,
    patchClaim,
    moveToStatus,
  };
}
