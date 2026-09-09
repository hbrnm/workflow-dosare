import React, { useState, useMemo } from "react";
import {
  X,
  ClipboardList,
  FileDown,
  Car,
  Plus,
  Trash2,
  Calendar,
  Clock,
  ShieldCheck,
  MessageCircle,
  ImageIcon,
  Loader2,
  CheckCircle2,
  Tag,
  AlertTriangle,
  Mail,
  Phone,
  User,
  Copy,
  Check
} from "lucide-react";
import { CAR_PANELS } from "../common/CarDamageVisualSelector";
import { generateCerereReconstatarePdf } from "../../utils/generateCerereReconstatarePdf";
import { todayISO, waLink } from "../../utils/dateUtils";
import { loadCachedBranding } from "../../constants/branding";
import {
  getInsurerDefaultEmail,
  buildReconstatareEmailSubject,
  buildReconstatareEmailBody,
  buildReconstatareMailtoUrl,
  copyFormattedEmailToClipboard,
  buildReconstatareWaMessage,
  buildReconstatareWaUrl,
} from "../../utils/emailInspectorUtils";

export default function ReconstatareModal({
  isOpen,
  onClose,
  claim,
  onPatchClaim,
  onNotify,
}) {
  if (!isOpen || !claim) return null;

  const branding = loadCachedBranding() || {};
  const defaultInsurerEmail = useMemo(
    () => getInsurerDefaultEmail(claim.asigurator),
    [claim.asigurator]
  );

  const [inspectorDauna, setInspectorDauna] = useState(() => claim.inspectorDauna || "");
  const [nrDosarAsigurator, setNrDosarAsigurator] = useState(() => claim.nrDosarAsigurator || claim.numarDosar || "");
  const [emailInspector, setEmailInspector] = useState(
    () => claim.emailInspector || claim.financiar?.emailInspector || defaultInsurerEmail || ""
  );
  const [telefonInspector, setTelefonInspector] = useState(
    () => claim.telefonInspector || claim.financiar?.telefonInspector || ""
  );
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [dataCerere, setDataCerere] = useState(() => todayISO());
  const [modDesfasurare, setModDesfasurare] = useState("Fizic la atelier"); // "Fizic la atelier" | "Online / Plansa foto"
  const [intervalOrar, setIntervalOrar] = useState("09:00 - 17:00");
  const [motivatie, setMotivatie] = useState(
    "In urma dezechiparii si demontarii reperelor exterioare avariate au fost identificate elemente de caroserie deformate, prinderi rupte si daune ascunse necuprinse in nota initiala de constatare."
  );

  // Inițializăm reperele de reconstatat din operațiunile existente sau avarii
  const [repere, setRepere] = useState(() => {
    const existing = Array.isArray(claim.operatiuni) ? claim.operatiuni : [];
    if (existing.length > 0) {
      return existing.map((op, idx) => ({
        id: op.id || String(idx + 1),
        piesa: op.piesa || "",
        operatiune: op.inl ? "INL (Inlocuire)" : op.rep ? "REP (Reparatie)" : op.rev ? "REV (Revopsire)" : "INL / D/R",
        descriere: "Element avariat descoperit la dezechipare",
      }));
    }
    return [
      {
        id: "1",
        piesa: "Armatura bara / Suporti interiori",
        operatiune: "INL (Inlocuire)",
        descriere: "Fisurat / deformat in spatele barii exterioare",
      },
    ];
  });

  const [generating, setGenerating] = useState(false);

  // Numărul de fotografii existente în dosar (în special cele din categoria reconstatare)
  const reconstatarePoze = useMemo(() => {
    const all = Array.isArray(claim.poze) ? claim.poze : [];
    return all.filter((p) => p && (p.categoria === "reconstatare" || p.categoria === "generale"));
  }, [claim.poze]);

  const handleAddRow = () => {
    setRepere((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        piesa: "",
        operatiune: "INL (Inlocuire)",
        descriere: "Deformat / rupt interior",
      },
    ]);
  };

  const handleRemoveRow = (id) => {
    setRepere((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRow = (id, field, val) => {
    setRepere((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const handleQuickAddPanel = (panelName) => {
    if (!panelName) return;
    setRepere((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        piesa: panelName.toUpperCase(),
        operatiune: "INL (Inlocuire)",
        descriere: "Avariat interior / ghidaje rupte",
      },
    ]);
  };

  const handlePersistContact = () => {
    if (!onPatchClaim) return;
    const patch = {};
    if (inspectorDauna !== claim.inspectorDauna) patch.inspectorDauna = inspectorDauna;
    if (nrDosarAsigurator !== claim.nrDosarAsigurator) patch.nrDosarAsigurator = nrDosarAsigurator;

    const fin = { ...(claim.financiar || {}) };
    let finChanged = false;
    if (emailInspector && emailInspector !== fin.emailInspector) {
      fin.emailInspector = emailInspector;
      finChanged = true;
    }
    if (telefonInspector && telefonInspector !== fin.telefonInspector) {
      fin.telefonInspector = telefonInspector;
      finChanged = true;
    }
    if (finChanged) {
      patch.financiar = fin;
    }

    if (Object.keys(patch).length > 0) {
      onPatchClaim(patch);
    }
  };

  const emailSubject = useMemo(() => {
    return buildReconstatareEmailSubject({ claim, nrDosarAsigurator });
  }, [claim, nrDosarAsigurator]);

  const emailBody = useMemo(() => {
    return buildReconstatareEmailBody({
      claim,
      inspectorDauna,
      nrDosarAsigurator,
      dataCerere,
      modDesfasurare,
      intervalOrar,
      motivatie,
      repere,
      branding,
    });
  }, [
    claim,
    inspectorDauna,
    nrDosarAsigurator,
    dataCerere,
    modDesfasurare,
    intervalOrar,
    motivatie,
    repere,
    branding,
  ]);

  const mailtoUrl = useMemo(() => {
    return buildReconstatareMailtoUrl({
      to: emailInspector,
      subject: emailSubject,
      body: emailBody,
    });
  }, [emailInspector, emailSubject, emailBody]);

  const handleCopyEmailText = async () => {
    try {
      const ok = await copyFormattedEmailToClipboard({
        subject: emailSubject,
        body: emailBody,
      });
      if (ok) {
        setCopiedEmail(true);
        onNotify?.("Textul email-ului a fost copiat în clipboard (formatat pe linii separate)!", "success");
        setTimeout(() => setCopiedEmail(false), 2500);
      } else {
        window.prompt("Copiază textul email-ului:", emailBody);
      }
    } catch {
      window.prompt("Copiază textul email-ului:", emailBody);
    }
  };

  const handleCopySubject = async () => {
    try {
      await navigator.clipboard.writeText(emailSubject);
      setCopiedSubject(true);
      onNotify?.("Subiectul email-ului a fost copiat în clipboard!", "success");
      setTimeout(() => setCopiedSubject(false), 2500);
    } catch {
      window.prompt("Copiază subiectul:", emailSubject);
    }
  };

  const repereCount = useMemo(() => {
    return repere.filter((r) => r && String(r.piesa || "").trim().length > 0).length;
  }, [repere]);

  const waMessage = useMemo(() => {
    return buildReconstatareWaMessage({
      claim,
      inspectorDauna,
      nrDosarAsigurator,
      branding,
      repereCount,
    });
  }, [claim, inspectorDauna, nrDosarAsigurator, branding, repereCount]);

  const handleOpenWhatsApp = (e) => {
    e?.preventDefault();
    handlePersistContact();
    const waUrl = buildReconstatareWaUrl({
      phone: telefonInspector,
      message: waMessage,
    });
    window.open(waUrl, "_blank", "noopener,noreferrer");
    if (!telefonInspector || !String(telefonInspector).replace(/\D/g, "")) {
      onNotify?.(
        "S-a deschis WhatsApp. Selectează inspectorul din contacte (sau completează telefonul în formular).",
        "info"
      );
    } else {
      onNotify?.("S-a deschis conversația WhatsApp cu inspectorul de daună.", "success");
    }
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const dataPayload = {
        inspectorDauna,
        nrDosarAsigurator,
        dataCerere,
        mod: modDesfasurare,
        dataOra: intervalOrar,
        motivatie,
        repere: repere.filter((r) => String(r.piesa || "").trim().length > 0),
        pozeCount: reconstatarePoze.length,
      };

      await generateCerereReconstatarePdf({
        claim: {
          ...claim,
          nrDosarAsigurator: nrDosarAsigurator || claim.nrDosarAsigurator,
          inspectorDauna: inspectorDauna || claim.inspectorDauna,
        },
        reconstatareData: dataPayload,
        atelierBranding: branding,
      });

      handlePersistContact();
      onNotify?.("Cererea de reconstatare a fost generată și descărcată cu succes!", "success");
    } catch (err) {
      console.error(err);
      onNotify?.("Eroare la generarea PDF: " + (err.message || err), "error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-[v2-fade-in_0.2s_ease]">
      <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-[v2-scale-in_0.2s_ease]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--app-border)] bg-[var(--app-surface-2)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
              <ClipboardList size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[var(--app-text-strong)] flex items-center gap-1.5">
                Cerere &amp; Notă de Reconstatare Daune
                <span className="text-[10.5px] font-mono font-bold bg-[var(--app-accent)]/15 text-[var(--app-accent)] px-1.5 py-0.5 rounded">
                  {claim.numarInmatriculare || claim.numarDosar}
                </span>
              </h2>
              <p className="text-[11px] text-[var(--app-muted)]">
                Generează avizul oficial pentru asigurator cu piesele și deformările ascunse descoperite la demontare.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="p-4 space-y-4 overflow-y-auto text-[12px]">
          {/* Card Asigurator & Inspector */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-[var(--app-surface-2)]/60 border border-[var(--app-border)]/80 rounded-xl p-3">
            {/* 1. Asigurător */}
            <div>
              <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
                <ShieldCheck size={12} className="text-sky-600" /> Asigurător Daună
              </label>
              <input
                type="text"
                readOnly
                value={claim.asigurator || "Nespecificat"}
                className="w-full text-[11.5px] font-semibold bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text-strong)]"
              />
            </div>

            {/* 2. Nr. Dosar Asigurator */}
            <div>
              <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-1">
                Nr. Dosar Asigurator
              </label>
              <input
                type="text"
                value={nrDosarAsigurator}
                onChange={(e) => setNrDosarAsigurator(e.target.value)}
                placeholder="ex: 90218412"
                className="w-full text-[11.5px] font-mono font-semibold bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] focus:border-[var(--app-accent)]"
              />
            </div>

            {/* 3. Nume Inspector */}
            <div>
              <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
                <User size={12} className="text-slate-500" /> Nume Inspector Daune
              </label>
              <input
                type="text"
                value={inspectorDauna}
                onChange={(e) => setInspectorDauna(e.target.value)}
                placeholder="ex: Popescu Ion"
                className="w-full text-[11.5px] font-semibold bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] focus:border-[var(--app-accent)]"
              />
            </div>

            {/* 4. Email Inspector / Departament Daune */}
            <div className="sm:col-span-2 md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10.5px] font-bold text-[var(--app-muted)] flex items-center gap-1">
                  <Mail size={12} className="text-sky-600" /> Email Inspector / Departament Daune
                </label>
                {defaultInsurerEmail && emailInspector !== defaultInsurerEmail && (
                  <button
                    type="button"
                    onClick={() => setEmailInspector(defaultInsurerEmail)}
                    className="text-[9.5px] text-sky-600 hover:underline cursor-pointer font-semibold"
                    title={`Folosește adresa implicită pentru ${claim.asigurator}`}
                  >
                    Reset la {defaultInsurerEmail}
                  </button>
                )}
              </div>
              <input
                type="email"
                value={emailInspector}
                onChange={(e) => setEmailInspector(e.target.value)}
                placeholder="ex: daune@omniasig.ro sau inspector@asigurator.ro"
                className="w-full text-[11.5px] font-medium bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] focus:border-[var(--app-accent)]"
              />
            </div>

            {/* 5. Telefon Inspector (pentru WhatsApp) */}
            <div>
              <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
                <Phone size={12} className="text-emerald-600" /> Telefon Inspector (WhatsApp)
              </label>
              <input
                type="tel"
                value={telefonInspector}
                onChange={(e) => setTelefonInspector(e.target.value)}
                placeholder="ex: 0722123456"
                className="w-full text-[11.5px] font-mono font-medium bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] focus:border-[var(--app-accent)]"
              />
            </div>
          </div>

          {/* Justificare Tehnica */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--app-text-strong)] mb-1 flex items-center gap-1">
              <AlertTriangle size={13} className="text-amber-600" /> Motivație Tehnică (constatare la dezechipare)
            </label>
            <textarea
              rows={2}
              value={motivatie}
              onChange={(e) => setMotivatie(e.target.value)}
              className="w-full text-[11.5px] p-2 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg text-[var(--app-text)] focus:border-[var(--app-accent)] leading-relaxed"
              placeholder="Descrie cum au fost identificate noile avarii..."
            />
          </div>

          {/* Repere & Piese de Reconstatat */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-extrabold text-[var(--app-text-strong)] uppercase tracking-wide">
                Repere Suplimentare de Reconstatat ({repere.length})
              </span>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    handleQuickAddPanel(e.target.value);
                    e.target.value = "";
                  }}
                  defaultValue=""
                  className="text-[10.5px] font-medium bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded px-2 py-1 text-[var(--app-muted)]"
                >
                  <option value="" disabled>+ Adaugă reper caroserie...</option>
                  {CAR_PANELS.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="text-[10.5px] font-extrabold px-2 py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Linie liberă
                </button>
              </div>
            </div>

            <div className="border border-[var(--app-border)] rounded-xl overflow-hidden shadow-2xs">
              <div className="grid grid-cols-12 gap-1 bg-[var(--app-surface-2)] px-2.5 py-1.5 text-[10px] font-extrabold uppercase text-[var(--app-muted)] border-b border-[var(--app-border)]">
                <div className="col-span-5">Piesă / Reper solicitat</div>
                <div className="col-span-3">Operațiune</div>
                <div className="col-span-3">Justificare avarie</div>
                <div className="col-span-1 text-center">Șterge</div>
              </div>

              <div className="divide-y divide-[var(--app-border)]/60 max-h-48 overflow-y-auto bg-[var(--app-surface)]">
                {repere.length === 0 ? (
                  <div className="p-3 text-center text-[11px] text-[var(--app-muted)] italic">
                    Niciun reper adăugat. Apasă pe „+ Linie liberă” sau alege din meniul de repere.
                  </div>
                ) : (
                  repere.map((r, idx) => (
                    <div key={r.id || idx} className="grid grid-cols-12 gap-1 items-center px-2 py-1.5">
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={r.piesa}
                          onChange={(e) => handleUpdateRow(r.id, "piesa", e.target.value.toUpperCase())}
                          placeholder="ex: ARMATURA BARA FATA"
                          className="w-full text-[11px] font-bold p-1 bg-[var(--app-surface-2)]/60 border border-[var(--app-border)]/80 rounded uppercase text-[var(--app-text-strong)]"
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          value={r.operatiune}
                          onChange={(e) => handleUpdateRow(r.id, "operatiune", e.target.value)}
                          className="w-full text-[10.5px] font-bold p-1 bg-[var(--app-surface-2)]/60 border border-[var(--app-border)]/80 rounded text-red-700 dark:text-red-400"
                        >
                          <option value="INL (Inlocuire)">INL (Înlocuire)</option>
                          <option value="REP (Reparatie)">REP (Reparație)</option>
                          <option value="REV (Revopsire)">REV (Revopsire)</option>
                          <option value="D/R (Demontat/Remontat)">D/R (Demontat/Remontat)</option>
                          <option value="INL + REV">INL + REV</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={r.descriere}
                          onChange={(e) => handleUpdateRow(r.id, "descriere", e.target.value)}
                          placeholder="ex: Urechi rupte, deformat"
                          className="w-full text-[10.5px] p-1 bg-[var(--app-surface-2)]/60 border border-[var(--app-border)]/80 rounded text-[var(--app-text)]"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(r.id)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Desfășurare Reconstatare & Planșă foto */}
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-[var(--app-surface-2)]/40 border border-[var(--app-border)] rounded-xl p-3 space-y-2">
              <span className="text-[11px] font-bold text-[var(--app-text-strong)] flex items-center gap-1.5">
                <Calendar size={13} className="text-[var(--app-accent)]" /> Modalitate &amp; Interval
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[var(--app-muted)] mb-0.5">Mod inspecție:</label>
                  <select
                    value={modDesfasurare}
                    onChange={(e) => setModDesfasurare(e.target.value)}
                    className="w-full text-[11px] p-1.5 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg text-[var(--app-text)] font-semibold"
                  >
                    <option value="Fizic la atelier">Fizic la atelier</option>
                    <option value="Online pe baza foto">Online pe baza foto</option>
                    <option value="Apel video / Live">Apel video / Live</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--app-muted)] mb-0.5">Interval orar:</label>
                  <input
                    type="text"
                    value={intervalOrar}
                    onChange={(e) => setIntervalOrar(e.target.value)}
                    className="w-full text-[11px] p-1.5 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg text-[var(--app-text)] font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[var(--app-surface-2)]/40 border border-[var(--app-border)] rounded-xl p-3 space-y-1">
              <span className="text-[11px] font-bold text-[var(--app-text-strong)] flex items-center gap-1.5">
                <ImageIcon size={13} className="text-sky-600" /> Planșă Foto din Dosar
              </span>
              <p className="text-[10.5px] text-[var(--app-muted)] leading-relaxed">
                {reconstatarePoze.length > 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> {reconstatarePoze.length} fotografii disponibile în dosar
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">
                    Nu există fotografii salvate la secțiunea „Reconstatare” în dosar. Le poți adăuga din tab-ul Media.
                  </span>
                )}
              </p>
              <div className="text-[10px] text-[var(--app-muted)]">
                Vehiculul este păstrat dezechipat în atelier până la efectuarea inspecției.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[var(--app-border)] bg-[var(--app-surface-2)] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Buton WhatsApp (deschide garantat cu sau fără telefon) */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
              title="Trimite solicitare rapidă pe WhatsApp inspectorului"
            >
              <MessageCircle size={13} /> Solicită pe WhatsApp
            </button>

            {/* Buton Trimite Email Inspector */}
            <a
              href={mailtoUrl}
              onClick={handlePersistContact}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors cursor-pointer"
              title="Deschide clientul de email cu cererea de reconstatare și lista de repere preformatate"
            >
              <Mail size={13} /> Trimite Email Inspector
            </a>

            {/* Buton Copiază Text Email (pt Webmail / Gmail) */}
            <button
              type="button"
              onClick={handleCopyEmailText}
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-2)] text-[var(--app-text)] transition-colors cursor-pointer"
              title="Copiază corpul email-ului formatat pe rânduri separate (util pentru Gmail / Webmail)"
            >
              {copiedEmail ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copiedEmail ? "Text copiat!" : "Copiază text email"}</span>
            </button>

            {/* Buton Copiază Subiect */}
            <button
              type="button"
              onClick={handleCopySubject}
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-2 rounded-xl border border-[var(--app-border)]/70 bg-[var(--app-surface)] hover:bg-[var(--app-surface-2)] text-[var(--app-muted)] hover:text-[var(--app-text)] transition-colors cursor-pointer"
              title="Copiază doar linia de subiect pentru căsuța Subject din Gmail/Outlook"
            >
              {copiedSubject ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
              <span>{copiedSubject ? "Subiect copiat" : "Copiază subiect"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-2)] text-[var(--app-text)] text-[11px] font-bold transition-colors cursor-pointer"
            >
              Închide
            </button>
            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[11.5px] font-extrabold shadow-sm transition-all cursor-pointer"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              <span>Generează &amp; Descarcă PDF Reconstatare</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
