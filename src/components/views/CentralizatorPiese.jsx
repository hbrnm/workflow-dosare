import React, { useState, useMemo } from "react";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ExternalLink,
  Phone,
  Building,
  Tag,
  DollarSign,
  Layers,
  ArrowUpDown,
  Check,
  RotateCcw,
  Calendar,
  AlertCircle
} from "lucide-react";
import { PART_STATUSES, COMMON_SUPPLIERS } from "../common/PartsLifecyclePanel";
import { getStatusDefinition } from "../../constants/config";
import { fmtDate, telLink, todayISO } from "../../utils/dateUtils";
import ClaimPlate from "../common/ClaimPlate";
import WhatsAppButton from "../common/WhatsAppButton";

export default function CentralizatorPiese({
  claims = [],
  onOpenClaim,
  onPatchClaim,
  canEditFn,
  onNotify,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [onlyActiveClaims, setOnlyActiveClaims] = useState(true);
  const [sortKey, setSortKey] = useState("termen"); // 'termen', 'auto', 'furnizor', 'status'
  const [sortAsc, setSortAsc] = useState(true);

  // Extragem toate piesele de inlocuire din toate dosarele
  const allParts = useMemo(() => {
    const list = [];
    (claims || []).forEach((claim) => {
      if (!claim) return;
      // Daca se doreste filtrarea dosarelor active (excludem facturate sau arhivate)
      if (onlyActiveClaims && (claim.status === "facturat" || claim.ridicata)) {
        return;
      }

      const ops = Array.isArray(claim.operatiuni) ? claim.operatiuni : [];
      ops.forEach((op, opIndex) => {
        // Piesa este relevanta daca are bifa INL sau are statusPiesa/furnizor/codPiesa
        if (op && (op.inl || op.statusPiesa || op.furnizor || op.pretAchizitie || op.codPiesa)) {
          const statusPiesa = op.statusPiesa || (claim.pieseSosite ? "sosit" : claim.dataComandaPiese ? "comandat" : "necomandat");
          list.push({
            id: op.id || `${claim.id}_${opIndex}`,
            claimId: claim.id,
            claim,
            opIndex,
            op,
            piesa: op.piesa || "Piesa nespecificata",
            codPiesa: op.codPiesa || "",
            furnizor: op.furnizor || "",
            pretAchizitie: Number(op.pretAchizitie) || 0,
            awb: op.awb || "",
            statusPiesa,
            termenLivrare: claim.termenLivrarePiese || "",
            dataComanda: claim.dataComandaPiese || "",
            dataDeschidere: claim.dataDeschiderii || "",
            numarDosar: claim.numarDosar || "",
            numarInmatriculare: claim.numarInmatriculare || "",
            marcaModel: claim.marcaModel || "",
            client: claim.client || "",
            telefon: claim.telefonClient || "",
            asigurator: claim.asigurator || "",
          });
        }
      });
    });
    return list;
  }, [claims, onlyActiveClaims]);

  // Calcul statistici rapide
  const stats = useMemo(() => {
    const total = allParts.length;
    const sosite = allParts.filter((p) => p.statusPiesa === "sosit" || p.statusPiesa === "montat").length;
    const inTranzit = allParts.filter((p) => p.statusPiesa === "in_tranzit").length;
    const comandate = allParts.filter((p) => p.statusPiesa === "comandat").length;
    const necomandate = allParts.filter((p) => p.statusPiesa === "necomandat" || p.statusPiesa === "cerere_oferta").length;
    const retur = allParts.filter((p) => p.statusPiesa === "retur").length;
    const totalValoare = allParts.reduce((acc, p) => acc + p.pretAchizitie, 0);

    return { total, sosite, inTranzit, comandate, necomandate, retur, totalValoare };
  }, [allParts]);

  // Lista unica a furnizorilor prezenti in comenzi
  const availableSuppliers = useMemo(() => {
    const set = new Set();
    allParts.forEach((p) => {
      if (p.furnizor) set.add(p.furnizor);
    });
    return Array.from(set).sort();
  }, [allParts]);

  // Filtrare cautare & dropdown-uri
  const filteredParts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allParts.filter((item) => {
      if (filterSupplier !== "all" && item.furnizor !== filterSupplier) {
        return false;
      }
      if (filterStatus !== "all") {
        if (filterStatus === "nesosite") {
          if (item.statusPiesa === "sosit" || item.statusPiesa === "montat") return false;
        } else if (item.statusPiesa !== filterStatus) {
          return false;
        }
      }
      if (term) {
        const haystack = [
          item.piesa,
          item.codPiesa,
          item.numarDosar,
          item.numarInmatriculare,
          item.marcaModel,
          item.client,
          item.furnizor,
          item.awb,
          item.asigurator
        ].join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    }).sort((a, b) => {
      let diff = 0;
      if (sortKey === "termen") {
        diff = String(a.termenLivrare || a.dataComanda || "").localeCompare(String(b.termenLivrare || b.dataComanda || ""));
      } else if (sortKey === "auto") {
        diff = a.numarInmatriculare.localeCompare(b.numarInmatriculare);
      } else if (sortKey === "furnizor") {
        diff = (a.furnizor || "").localeCompare(b.furnizor || "");
      } else if (sortKey === "status") {
        diff = a.statusPiesa.localeCompare(b.statusPiesa);
      }
      return sortAsc ? diff : -diff;
    });
  }, [allParts, searchTerm, filterSupplier, filterStatus, sortKey, sortAsc]);

  // Modificare status piesa direct din tabel
  const handleUpdatePartStatus = async (item, newStatus) => {
    if (!onPatchClaim) return;
    const targetClaim = item.claim;
    const ops = [...(targetClaim.operatiuni || [])];

    const realIndex = ops.findIndex((o, idx) => {
      if (item.op?.id && o.id === item.op.id) return true;
      return idx === item.opIndex;
    });

    if (realIndex >= 0) {
      ops[realIndex] = { ...ops[realIndex], statusPiesa: newStatus };

      const allArrived = ops
        .filter((o) => o && (o.inl || o.statusPiesa))
        .every((o) => o.statusPiesa === "sosit" || o.statusPiesa === "montat");

      const patch = { operatiuni: ops };
      if (allArrived) {
        patch.pieseSosite = true;
      }

      const ok = await onPatchClaim(targetClaim.id, patch);
      if (ok !== false) {
        onNotify?.(`Piesa „${item.piesa}” (${item.numarInmatriculare}) -> ${newStatus.toUpperCase()}`, "success");
      }
    }
  };

  const handleQuickMarkSosit = (item) => {
    handleUpdatePartStatus(item, "sosit");
  };

  const toggleSort = (k) => {
    if (sortKey === k) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(k);
      setSortAsc(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-3 min-h-0">
      {/* Top Banner KPI / Statut comenzi */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 shrink-0">
        <div
          onClick={() => setFilterStatus("all")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === "all"
              ? "bg-[var(--app-surface-2)] text-[var(--app-text-strong)] border-[var(--app-accent)] shadow-xs ring-1 ring-[var(--app-accent)]"
              : "bg-[var(--app-surface)] text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-extrabold uppercase text-[var(--app-muted)]">Total Repere</span>
            <Package size={14} className="text-[var(--app-muted)]" />
          </div>
          <p className="text-xl font-black mt-1 font-mono text-[var(--app-text-strong)]">{stats.total}</p>
          <span className="text-[10px] text-[var(--app-muted)]">toate piesele active</span>
        </div>

        <div
          onClick={() => setFilterStatus("nesosite")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === "nesosite"
              ? "bg-[var(--app-surface-2)] text-[var(--app-text-strong)] border-[var(--app-accent)] shadow-xs ring-1 ring-[var(--app-accent)]"
              : "bg-[var(--app-surface)] text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-extrabold uppercase text-[var(--app-muted)]">În Așteptare</span>
            <Clock size={14} className="text-[var(--app-muted)]" />
          </div>
          <p className="text-xl font-black mt-1 font-mono text-[var(--app-text-strong)]">
            {stats.comandate + stats.inTranzit + stats.necomandate}
          </p>
          <span className="text-[10px] text-[var(--app-muted)]">nelivrate încă</span>
        </div>

        <div
          onClick={() => setFilterStatus("in_tranzit")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === "in_tranzit"
              ? "bg-[var(--app-surface-2)] text-[var(--app-text-strong)] border-[var(--app-accent)] shadow-xs ring-1 ring-[var(--app-accent)]"
              : "bg-[var(--app-surface)] text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-extrabold uppercase text-[var(--app-muted)]">În Tranzit</span>
            <Truck size={14} className="text-[var(--app-muted)]" />
          </div>
          <p className="text-xl font-black mt-1 font-mono text-[var(--app-text-strong)]">
            {stats.inTranzit}
          </p>
          <span className="text-[10px] text-[var(--app-muted)]">pe traseu / curier</span>
        </div>

        <div
          onClick={() => setFilterStatus("sosit")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === "sosit"
              ? "bg-[var(--app-surface-2)] text-[var(--app-text-strong)] border-[var(--app-accent)] shadow-xs ring-1 ring-[var(--app-accent)]"
              : "bg-[var(--app-surface)] text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-extrabold uppercase text-[var(--app-muted)]">Sosite în Service</span>
            <CheckCircle2 size={14} className="text-[var(--app-muted)]" />
          </div>
          <p className="text-xl font-black mt-1 font-mono text-[var(--app-text-strong)]">
            {stats.sosite}
          </p>
          <span className="text-[10px] text-[var(--app-muted)]">recepționate / montate</span>
        </div>

        <div
          onClick={() => setFilterStatus("retur")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === "retur"
              ? "bg-[var(--app-surface-2)] text-[var(--app-text-strong)] border-[var(--app-accent)] shadow-xs ring-1 ring-[var(--app-accent)]"
              : "bg-[var(--app-surface)] text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-extrabold uppercase text-[var(--app-muted)]">Retur</span>
            <RotateCcw size={14} className="text-[var(--app-muted)]" />
          </div>
          <p className="text-xl font-black mt-1 font-mono text-[var(--app-text-strong)]">
            {stats.retur}
          </p>
          <span className="text-[10px] text-[var(--app-muted)]">necesită re-comandă</span>
        </div>

        <div className="p-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-extrabold uppercase text-[var(--app-muted)]">Valoare Totală</span>
            <DollarSign size={14} className="text-[var(--app-muted)]" />
          </div>
          <p className="text-xl font-black mt-1 font-mono text-[var(--app-text-strong)]">
            {stats.totalValoare.toLocaleString("ro-RO")} <span className="text-[11px] font-semibold text-[var(--app-muted)]">lei</span>
          </p>
          <span className="text-[10px] text-[var(--app-muted)]">achiziție piese active</span>
        </div>
      </div>

      {/* Bara de instrumente: Filtre, Cautare & Furnizor */}
      <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Cautare text */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cauta piesa, cod OE, dosar, auto, AWB..."
              className="w-full pl-8 pr-2.5 py-1.5 text-[12px] bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg font-medium text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--app-muted)] hover:text-[var(--app-text)]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtru Furnizor */}
          <div className="flex items-center gap-1">
            <Building size={13} className="text-[var(--app-muted)] hidden sm:inline" />
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="text-[11.5px] font-semibold bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] cursor-pointer"
            >
              <option value="all">Toti furnizorii</option>
              {COMMON_SUPPLIERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              {availableSuppliers
                .filter((s) => !COMMON_SUPPLIERS.includes(s))
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          </div>

          {/* Filtru Status Piese */}
          <div className="flex items-center gap-1">
            <Tag size={13} className="text-[var(--app-muted)] hidden sm:inline" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-[11.5px] font-semibold bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] cursor-pointer"
            >
              <option value="all">Toate statusurile</option>
              <option value="nesosite">⚠️ Doar nelivrate (In asteptare)</option>
              {PART_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buton comutare doar dosare active */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--app-muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyActiveClaims}
              onChange={(e) => setOnlyActiveClaims(e.target.checked)}
              className="rounded accent-[var(--app-accent)]"
            />
            <span>Doar dosare active</span>
          </label>

          <span className="text-[11.5px] font-mono font-bold text-[var(--app-muted)] bg-[var(--app-surface-2)] px-2 py-1 rounded-lg border border-[var(--app-border)]">
            {filteredParts.length} {filteredParts.length === 1 ? "piesa" : "piese"}
          </span>
        </div>
      </div>

      {/* Tabel Centralizator Piese */}
      <div className="flex-1 min-h-0 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl overflow-hidden flex flex-col shadow-xs">
        <div className="overflow-x-auto overflow-y-auto flex-1 scrollbar-thin">
          {filteredParts.length === 0 ? (
            <div className="p-8 text-center text-[var(--app-muted)] space-y-2">
              <Package size={36} className="mx-auto opacity-40 text-amber-500" />
              <p className="text-[13px] font-bold text-[var(--app-text-strong)]">
                Nicio piesa gasita conform filtrelor selectate.
              </p>
              <p className="text-[11px]">
                Piesele apar aici automat atunci cand se bifeaza „INL” (Inlocuire) pe oricare dosar sau cand sunt adaugate in sectiunea Gestiune Piese.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-[11.5px]">
              <thead className="bg-[var(--app-surface-2)] border-b border-[var(--app-border)] text-[var(--app-muted)] uppercase text-[10px] font-extrabold sticky top-0 z-10">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th
                    className="p-2.5 cursor-pointer hover:text-[var(--app-text)] select-none"
                    onClick={() => toggleSort("auto")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Vehicul &amp; Dosar</span>
                      <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th className="p-2.5 min-w-[180px]">Piesa / Denumire Reper</th>
                  <th className="p-2.5">Cod Piesa (OE/AM)</th>
                  <th
                    className="p-2.5 cursor-pointer hover:text-[var(--app-text)] select-none"
                    onClick={() => toggleSort("furnizor")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Furnizor</span>
                      <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th
                    className="p-2.5 cursor-pointer hover:text-[var(--app-text)] select-none"
                    onClick={() => toggleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Status Livrare</span>
                      <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th
                    className="p-2.5 cursor-pointer hover:text-[var(--app-text)] select-none text-right"
                    onClick={() => toggleSort("termen")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Termen / Comanda</span>
                      <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th className="p-2.5 text-right">Cost (lei)</th>
                  <th className="p-2.5 text-center">Actiuni Rapide</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]/60 font-medium">
                {filteredParts.map((item, idx) => {
                  const stDef = PART_STATUSES.find((s) => s.id === item.statusPiesa) || {
                    id: item.statusPiesa,
                    label: item.statusPiesa,
                    color: "bg-slate-100 text-slate-700",
                  };
                  const isSosit = item.statusPiesa === "sosit" || item.statusPiesa === "montat";
                  const overdue =
                    item.termenLivrare &&
                    !isSosit &&
                    item.termenLivrare < todayISO();

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[var(--app-surface-2)]/50 transition-colors group"
                    >
                      {/* Numar curent */}
                      <td className="p-2.5 text-center text-[10px] font-mono text-[var(--app-muted)] font-bold">
                        {idx + 1}
                      </td>

                      {/* Vehicul & Dosar */}
                      <td className="p-2.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <ClaimPlate value={item.numarInmatriculare} />
                            {item.numarDosar && (
                              <span className="text-[10px] font-mono text-[var(--app-muted)]">
                                #{item.numarDosar}
                              </span>
                            )}
                          </div>
                          <span className="text-[10.5px] text-[var(--app-muted)] truncate max-w-[160px]">
                            {item.marcaModel || item.client || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Denumire Piesa */}
                      <td className="p-2.5">
                        <div className="font-extrabold uppercase text-[var(--app-text-strong)] flex items-center gap-1.5">
                          <span>{item.piesa}</span>
                          {item.awb && (
                            <span
                              className="text-[9.5px] font-mono px-1 py-0.2 rounded bg-[var(--app-surface-2)] text-[var(--app-muted)] border border-[var(--app-border)]"
                              title={`AWB: ${item.awb}`}
                            >
                              AWB: {item.awb}
                            </span>
                          )}
                        </div>
                        {item.asigurator && (
                          <span className="text-[10px] text-[var(--app-muted)]">
                            Asigurator: {item.asigurator}
                          </span>
                        )}
                      </td>

                      {/* Cod Piesa */}
                      <td className="p-2.5">
                        {item.codPiesa ? (
                          <span className="font-mono font-bold text-[11px] text-[var(--app-text)] bg-[var(--app-surface-2)] px-1.5 py-0.5 rounded border border-[var(--app-border)]">
                            {item.codPiesa}
                          </span>
                        ) : (
                          <span className="text-[var(--app-muted)] italic text-[10px]">—</span>
                        )}
                      </td>

                      {/* Furnizor */}
                      <td className="p-2.5">
                        {item.furnizor ? (
                          <span className="font-semibold text-[11px] text-[var(--app-text-strong)] flex items-center gap-1">
                            <Building size={11} className="text-[var(--app-muted)]" />
                            {item.furnizor}
                          </span>
                        ) : (
                          <span className="text-[var(--app-muted)] italic text-[10px]">—</span>
                        )}
                      </td>

                      {/* Status Livrare (Dropdown inline) */}
                      <td className="p-2.5">
                        <select
                          value={item.statusPiesa}
                          onChange={(e) => handleUpdatePartStatus(item, e.target.value)}
                          className={`text-[10px] font-extrabold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none transition-colors ${stDef.color}`}
                        >
                          {PART_STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Termen / Comanda */}
                      <td className="p-2.5 text-right font-mono text-[10.5px]">
                        {item.termenLivrare ? (
                          <span
                            className={`font-bold inline-flex items-center gap-0.5 ${
                              overdue ? "text-red-600 dark:text-red-400 font-black" : "text-[var(--app-text)]"
                            }`}
                            title={overdue ? "Termen de livrare depasit!" : "Termen estimat de livrare"}
                          >
                            {overdue && <AlertCircle size={10} className="text-red-600" />}
                            {fmtDate(item.termenLivrare)}
                          </span>
                        ) : item.dataComanda ? (
                          <span className="text-[var(--app-muted)]">
                            Cmd: {fmtDate(item.dataComanda)}
                          </span>
                        ) : (
                          <span className="text-[var(--app-muted)] italic text-[10px]">—</span>
                        )}
                      </td>

                      {/* Pret achizitie */}
                      <td className="p-2.5 text-right font-mono font-bold text-[11px] text-[var(--app-text-strong)]">
                        {item.pretAchizitie > 0 ? (
                          <span>{item.pretAchizitie.toLocaleString("ro-RO")} lei</span>
                        ) : (
                          <span className="text-[var(--app-muted)] font-normal text-[10px]">—</span>
                        )}
                      </td>

                      {/* Actiuni Rapide */}
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!isSosit && (
                            <button
                              type="button"
                              onClick={() => handleQuickMarkSosit(item)}
                              className="p-1 px-1.5 rounded-md bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white font-bold text-[10px] flex items-center gap-0.5 shadow-2xs transition-colors cursor-pointer"
                              title="Marcheaza ca Sosita in atelier"
                            >
                              <Check size={11} /> Sosit
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenClaim?.(item.claim)}
                            className="p-1 rounded-md bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] text-[var(--app-text)] border border-[var(--app-border)] transition-colors cursor-pointer"
                            title="Deschide fisa dosarului"
                          >
                            <ExternalLink size={12} />
                          </button>

                          {item.telefon && (
                            <WhatsAppButton
                              phone={item.telefon}
                              claim={item.claim}
                              size={12}
                              className="p-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
