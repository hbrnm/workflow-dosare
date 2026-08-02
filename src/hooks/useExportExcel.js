import { useCallback } from "react";
import * as XLSX from "xlsx";
import { todayISO, fmtDate } from "../utils/dateUtils";
import { getStatusDefinition } from "../constants/config";

export function useExportExcel(claims = []) {
  const exportExcel = useCallback(() => {
    const rows = claims.map((c) => ({
      "Nr. dosar": c.numarDosar,
      Tip: c.tipAsigurare,
      "Asigurător": c.asigurator,
      Client: c.client,
      "Nr. înmatriculare": c.numarInmatriculare,
      VIN: c.vin,
      "Marcă/Model": c.marcaModel,
      Status: getStatusDefinition(c.status).label,
      "Data deschiderii": fmtDate(c.dataDeschiderii),
      "Facturat Tinichigerie": c.manopera.tinichigerie.facturat,
      "Facturat Vopsitorie": c.manopera.vopsitorie.facturat,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dosare");
    XLSX.writeFile(wb, `dosare-dauna-${todayISO()}.xlsx`);
  }, [claims]);

  return { exportExcel };
}
