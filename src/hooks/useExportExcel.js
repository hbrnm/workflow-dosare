import { useCallback } from "react";
import { downloadAllClaimsQuick, EXPORT_FORMAT } from "../utils/exportClaimsList";

export function useExportExcel(claims = []) {
  const exportExcel = useCallback(async () => {
    await downloadAllClaimsQuick(claims, EXPORT_FORMAT.XLSX);
  }, [claims]);

  const exportPdf = useCallback(async () => {
    await downloadAllClaimsQuick(claims, EXPORT_FORMAT.PDF);
  }, [claims]);

  return { exportExcel, exportPdf };
}
