import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { uploadStorageItem } from "../utils/claimUtils";
import { todayISO } from "../utils/dateUtils";
import {
  getPendingUploads,
  getPendingUploadsCount,
  flushUploadQueue,
} from "../utils/uploadQueue";

/**
 * useOfflineUploadSync
 * Monitorizeaza starea conexiunii si sincronizeaza automat pozele si documentele
 * salvate offline in IndexedDB cand conexiunea Wi-Fi/Internet revine.
 */
export function useOfflineUploadSync({ onPatch, onNotify } = {}) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const onPatchRef = useRef(onPatch);
  onPatchRef.current = onPatch;

  const onNotifyRef = useRef(onNotify);
  onNotifyRef.current = onNotify;

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingUploadsCount();
      setPendingCount(count);
      return count;
    } catch {
      return 0;
    }
  }, []);

  const syncQueue = useCallback(async ({ quiet = false } = {}) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (!quiet) {
        onNotifyRef.current?.("Esti offline. Sincronizarea va incepe automat cand revine conexiunea Wi-Fi.", "info");
      }
      return { processed: 0, failed: 0, remaining: await getPendingUploadsCount() };
    }

    const initialCount = await getPendingUploadsCount();
    if (initialCount === 0) return { processed: 0, failed: 0, remaining: 0 };

    try {
      setIsSyncing(true);
      if (!quiet) {
        onNotifyRef.current?.(`Se sincronizeaza ${initialCount} fotografii salvate offline...`, "info");
      }

      const res = await flushUploadQueue(async (item) => {
        const isDoc = (item.folder || "poze") === "documente";
        const uploaded = await uploadStorageItem({
          supabaseClient: supabase,
          claimId: item.claimId,
          file: item.fileBlob,
          folder: item.folder || "poze",
          bucketName: item.bucketName || (isDoc ? "documente-dosare" : "poze-dosare"),
          extraFields: {
            categoria: item.category,
            nume: item.fileName,
            data: item.extraFields?.data || todayISO(),
            ...(item.extraFields || {}),
          },
        });

        if (!uploaded) return false;

        if (onPatchRef.current) {
          await onPatchRef.current(
            item.claimId,
            isDoc ? { appendDocumente: [uploaded] } : { appendPoze: [uploaded] },
            { quiet: true, skipOwnershipCheck: true }
          );
        }
        return true;
      });

      await refreshCount();

      if (res.processed > 0) {
        onNotifyRef.current?.(
          `✅ ${res.processed} ${res.processed === 1 ? "fotografie offline s-a sincronizat" : "fotografii offline s-au sincronizat"} cu succes in dosar!`,
          "success"
        );
      }

      return res;
    } catch (err) {
      console.warn("Eroare la sincronizarea cozii offline:", err);
      return { processed: 0, failed: 0, remaining: await getPendingUploadsCount() };
    } finally {
      setIsSyncing(false);
    }
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();

    const handleOnline = () => {
      // Scurta pauza pentru stabilizarea conexiunii Wi-Fi
      setTimeout(() => {
        syncQueue();
      }, 1500);
    };

    window.addEventListener("online", handleOnline);

    // Verificare periodica la fiecare 30 de secunde cand suntem online
    const interval = setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        getPendingUploadsCount().then((cnt) => {
          setPendingCount(cnt);
          if (cnt > 0) {
            syncQueue({ quiet: true });
          }
        });
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
    };
  }, [refreshCount, syncQueue]);

  return {
    pendingCount,
    isSyncing,
    syncQueue,
    refreshCount,
  };
}
