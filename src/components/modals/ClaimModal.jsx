import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText, FileDown, Copy, X, ShieldCheck, History, Loader2, Car, Phone, MessageCircle,
  Clock, AlertOctagon, Wrench, Paintbrush, ImageIcon, Upload, Trash2, Save, MessageSquare, Plus,
  FolderOpen, CheckCircle2, CalendarClock, Wallet, Tag, AlertCircle, Sparkles, User as UserIcon,
  CheckSquare, Square, Download, Calendar, Eye, Layers, Printer, ClipboardList, Package
} from "lucide-react";
import {
  STATUSES, INSURERS, INSURANCE_TYPES, getStatusDefinition, getPhaseColors, isPieseComandateStatus,
  MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES, MAX_POZE_PER_DOSAR, MAX_DOCUMENTE_PER_DOSAR
} from "../../constants/config";
import { fmtDate, fmtDateTime, todayISO, daysBetween, nowISO, telLink, waLink, uid, fmtProgramare } from "../../utils/dateUtils";
import {
  emptyClaim, sanitizeClaim, normalizedText, isValidPhone, storagePath, refreshStorageUrls, formatIstoricValoare, CAMP_LABELS, parseNumber, SIGNED_URL_TTL_SECONDS
} from "../../utils/claimUtils";
import {
  generateazaPDF,
  generateazaProcesVerbalMasinaSchimb,
  generateazaFisaIntrareService,
  generateazaCerereDespagubireOmniasig,
} from "../../utils/pdfGenerator";
import { resolveCerereDespagubireKind } from "../../utils/cerereDespagubire";
import { loadCachedBranding } from "../../constants/branding";
import { downloadClaimAsZip } from "../../utils/zipUtils";
import DocumentCropModal from "../common/DocumentCropModal";
import { supabase } from "../../supabaseClient";
import { fileToDataUrl } from "../../utils/documentScanner";
import DatePickerInput from "../common/DatePickerInput";
import StageBar from "../common/StageBar";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
  modalHeaderClass,
} from "../common/modalShellClasses";
import ClaimTimeline from "../common/ClaimTimeline";
import ClaimAuditMeta from "../common/ClaimAuditMeta";
import MobilePieseSositeRow from "../mobile/MobilePieseSositeRow";
import ClaimScheduleFields from "../common/ClaimScheduleFields";
import PhotoLightbox from "../common/PhotoLightbox";
import { shouldPromoteToProgramatOnSchedule, PRE_PROGRAMAT_STATUSES } from "../../utils/scheduleStatusEffects";

function applyClaimStatusChange(prev, newStatusKey) {
  const mappedKey = getStatusDefinition(newStatusKey).key;
  const statusChanged = getStatusDefinition(prev.status).key !== mappedKey;
  const updates = {
    status: mappedKey,
    dataSchimbareStatus: statusChanged ? nowISO() : prev.dataSchimbareStatus,
  };

  if (statusChanged) {
    updates.alerteAck = false;
  }

  if (mappedKey === "programat" && !prev.dataProgramare) {
    updates.dataProgramare = `${todayISO()}T09:00:00`;
  }

  if (PRE_PROGRAMAT_STATUSES.includes(mappedKey) || PRE_PROGRAMAT_STATUSES.includes(newStatusKey)) {
    updates.dataProgramare = null;
  }

  return { ...prev, ...updates };
}

function NotionPropertyRow({ icon: Icon, label, children, full }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 p-1 rounded-lg hover:bg-[var(--app-surface-2)] transition-colors border border-transparent hover:border-[var(--app-border)]/40 ${full ? "col-span-1 sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-1.5 min-w-[110px] shrink-0 text-[10px] font-semibold text-[var(--app-muted)]">
        {Icon && <Icon size={12} className="text-[var(--app-muted)] shrink-0" />}
        <span>{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

const SLASH_COMMANDS = [
  { cmd: "/alerta", label: "Alertă / Urgență", prefix: "[ALERTĂ]: ", Icon: AlertOctagon, color: "bg-red-50 text-[var(--app-danger)] border-red-200" },
  { cmd: "/piese", label: "Comandă / Statut Piese", prefix: "[PIESE]: ", Icon: Package, color: "bg-amber-50 text-[var(--app-warning)] border-amber-200" },
  { cmd: "/schimb", label: "Auto la Schimb", prefix: "[AUTO SCHIMB]: ", Icon: Car, color: "bg-blue-50 text-[var(--app-text)] border-blue-200" },
  { cmd: "/apel", label: "Apel efectuat Client / Asigurător", prefix: "[APEL CLIENT]: ", Icon: Phone, color: "bg-emerald-50 text-[var(--app-success)] border-emerald-200" },
  { cmd: "/deviz", label: "Deviz & Reconstatare", prefix: "[DEVIZ]: ", Icon: ClipboardList, color: "bg-[var(--app-surface-2)] text-[var(--app-text)] border-[var(--app-border)]" },
  { cmd: "/lucrare", label: "Stadiu Reparație Atelier", prefix: "[STADIU LUCRĂRI]: ", Icon: Wrench, color: "bg-[var(--app-surface-2)] text-[var(--app-text)] border-[var(--app-border)]" },
];

export function compressColorImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          const MAX_DIM = 1500;
          let w = img.width;
          let h = img.height;
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) {
              h = Math.round((h * MAX_DIM) / w);
              w = MAX_DIM;
            } else {
              w = Math.round((w * MAX_DIM) / h);
              h = MAX_DIM;
            }
          }

          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("Eroare la comprimarea imaginii."));
              return;
            }
            const name = (file.name || "foto").replace(/\.[^/.]+$/, "");
            const compressedFile = new File([blob], `${name}_opt.jpg`, { type: "image/jpeg" });
            resolve(compressedFile);
          }, "image/jpeg", 0.75);
        } catch (err) {
          reject(new Error("Eroare la comprimarea imaginii."));
        }
      };
      img.onerror = () => reject(new Error("Eroare la încărcarea imaginii."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Eroare la citirea imaginii."));
    reader.readAsDataURL(file);
  });
}

export function processScanImage(file) {
  // Compat: detecție 4 colțuri + Pro mode auto dacă poza e slabă
  return import("../../utils/documentScanner").then(({ processDocumentScan }) =>
    processDocumentScan(file, { pro: true }).then((r) => r.dataUrl)
  );
}

export default function ClaimModal({
  claim,
  allClaims,
  readOnly = false,
  insurersList = INSURERS,
  onClose,
  onSave,
  onPatch,
  onDelete,
  onNotify,
  onJumpTo,
  themeId = "atelier",
  desktopUi = false,
  userEmail = "",
}) {
  const safeClaim = useMemo(() => sanitizeClaim(claim), [claim]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [savingLocal, setSavingLocal] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest("select")) return;
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      setDragOffset({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const [form, setForm] = useState(safeClaim);
  const [baseline, setBaseline] = useState(safeClaim);
  const [unsavedPrompt, setUnsavedPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState("general"); // "general" | "media" | "financial" | "history"
  const [noteText, setNoteText] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const noteInputRef = useRef(null);
  const [scanSession, setScanSession] = useState(null); // { pages: [{ dataUrl, file }] }
  const [uploadingScan, setUploadingScan] = useState(false);
  const [istoric, setIstoric] = useState([]);
  const [loadingIstoric, setLoadingIstoric] = useState(false);
  const [uploadingPoze, setUploadingPoze] = useState(false);
  const [uploadingDocumente, setUploadingDocumente] = useState(false);
  const [previewPozaIndex, setPreviewPozaIndex] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [cropQueue, setCropQueue] = useState([]);
  const [cropMode, setCropMode] = useState("document"); // "document" | "scan"
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const pdfMenuRef = useRef(null);
  const [showFinancialAccordion, setShowFinancialAccordion] = useState(false);

  useEffect(() => {
    if (!pdfMenuOpen) return;
    const onDoc = (e) => {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target)) {
        setPdfMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [pdfMenuOpen]);

  const filteredSlashCommands = useMemo(() => {
    if (!noteText.includes("/")) return [];
    const query = noteText.slice(noteText.lastIndexOf("/")).toLowerCase();
    return SLASH_COMMANDS.filter(
      (c) => c.cmd.startsWith(query) || c.label.toLowerCase().includes(query.slice(1)) || c.prefix.toLowerCase().includes(query.slice(1))
    );
  }, [noteText]);

  const applySlashCommand = (prefix) => {
    const lastSlashIndex = noteText.lastIndexOf("/");
    const baseText = lastSlashIndex >= 0 ? noteText.slice(0, lastSlashIndex) : "";
    setNoteText(baseText + prefix);
    if (noteInputRef.current) {
      noteInputRef.current.focus();
    }
  };

  const addNote = (customPrefix = "") => {
    const textToAdd = (customPrefix + noteText).trim();
    if (!textToAdd) return;
    const author = String(userEmail || "").trim() || null;
    setForm((f) => ({
      ...f,
      note: [{ id: uid(), data: nowISO(), text: textToAdd, ...(author ? { author } : {}) }, ...(f.note || [])],
    }));
    setNoteText("");
  };

  const handleNoteKeyDown = (e) => {
    if (filteredSlashCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((prev) => (prev + 1) % filteredSlashCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = filteredSlashCommands[slashIndex] || filteredSlashCommands[0];
        if (selected) {
          applySlashCommand(selected.prefix);
        }
        return;
      }
      if (e.key === "Escape") {
        setNoteText((prev) => prev.replace(/\/[a-zA-Z]*$/, ""));
        return;
      }
    }
    if (e.key === "Enter") {
      e.preventDefault();
      addNote();
    }
  };

  const isNew = useMemo(() => !Array.isArray(allClaims) || !allClaims.some((c) => c && c.id === claim?.id), [allClaims, claim?.id]);

  const persistMediaPatch = async (patch) => {
    if (readOnly || !onPatch || isNew || !form.id) return;
    await onPatch(form.id, patch);
  };

  /** Media saved immediately via onPatch — sync baseline so it isn't "dirty". */
  const setFormMedia = (mediaPatch) => {
    setForm((f) => {
      const next = { ...f, ...mediaPatch };
      setBaseline((b) => ({ ...b, ...mediaPatch }));
      return next;
    });
  };

  useEffect(() => {
    const next = sanitizeClaim(claim);
    setForm(next);
    setBaseline(next);
    setUnsavedPrompt(false);
    setNoteText("");
  }, [claim?.id]);

  useEffect(() => {
    let cancelled = false;
    const loadStorageUrls = async () => {
      if (!claim?.id) return;
      // Mereu regenerăm URL-urile semnate — cele din DB expiră după TTL
      const hasMedia =
        (claim.poze || []).some((p) => p && (p.path || p.url)) ||
        (claim.documente || []).some((d) => d && (d.path || d.url));
      if (!hasMedia) return;

      const [poze, documente] = await Promise.all([
        refreshStorageUrls(claim.poze || [], "poze-dosare", supabase),
        refreshStorageUrls(claim.documente || [], "documente-dosare", supabase),
      ]);
      if (!cancelled) {
        // URL refresh is not a user edit — keep dirty baseline in sync
        setForm((current) => ({ ...current, poze, documente }));
        setBaseline((current) => ({ ...current, poze, documente }));
      }
    };
    loadStorageUrls();
    return () => { cancelled = true; };
  }, [claim?.id, claim?.poze, claim?.documente]);

  useEffect(() => {
    if (isNew || !claim?.id) { setIstoric([]); return; }
    setLoadingIstoric(true);
    supabase.from("istoric_dosar").select("*").eq("dosar_id", claim.id).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => { if (!cancelled) setIstoric(data || []); })
      .finally(() => setLoadingIstoric(false));
    let cancelled = false;
    return () => { cancelled = true; };
  }, [claim?.id, isNew]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setStage = (dept, val) => setForm((f) => ({ ...f, manopera: { ...(f.manopera || {}), [dept]: val } }));
  const setFinancial = (key, value) => setForm((f) => ({ ...f, financiar: { ...(f.financiar || {}), [key]: value } }));

  const financial = form.financiar || {};
  const valoareDevizAudatex = parseNumber(form.valoareDevizAudatex, 0);
  const valoareAcceptPlata = parseNumber(financial.valoareAcceptPlata ?? form.valoareAcceptataReglata, 0);
  const valoareFransiza = parseNumber(financial.valoareFransiza, 0);

  const manoperaTinichigerie = parseNumber(financial.manoperaTinichigerie ?? form.manopera?.tinichigerie?.facturat, 0);
  const manoperaVopsitorie = parseNumber(financial.manoperaVopsitorie ?? form.manopera?.vopsitorie?.facturat, 0);
  const totalManopera = manoperaTinichigerie + manoperaVopsitorie;

  const pretPieseAudatex = parseNumber(form.valoarePieseAudatex, 0);
  const pretPieseService = parseNumber(form.valoareAchizitiePiese, 0);
  const marjaPiese = pretPieseAudatex - pretPieseService;

  const cheltuieliDiverse = parseNumber(financial.cheltuieliDiverse ?? financial.costuriExterne, 0);
  const costMasinaSchimb = parseNumber(financial.costMasinaSchimb, 0);

  const venitNetTotal = valoareAcceptPlata > 0 ? valoareAcceptPlata : valoareDevizAudatex;
  const totalCosturiService = pretPieseService + cheltuieliDiverse + costMasinaSchimb;
  const profitBrutReal = venitNetTotal - totalCosturiService;
  const marjaProfitProc = venitNetTotal > 0 ? ((profitBrutReal / venitNetTotal) * 100).toFixed(1) : "0.0";

  const toggleGata = (checked) => setForm((f) => ({
    ...f,
    gataDeRidicare: checked,
    dataGataRidicare: checked ? nowISO() : null,
    ridicata: checked ? f.ridicata : false,
    dataRidicare: checked ? f.dataRidicare : null,
  }));

  const toggleRidicata = (checked) => setForm((f) => ({
    ...f,
    ridicata: checked,
    dataRidicare: checked ? nowISO() : null,
    gataDeRidicare: checked ? true : f.gataDeRidicare,
    dataGataRidicare: checked
      ? (f.dataGataRidicare || nowISO())
      : f.dataGataRidicare,
  }));

  const handleDuplicate = () => {
    const dup = {
      ...emptyClaim("primit"),
      numarInmatriculare: form.numarInmatriculare,
      vin: form.vin,
      marcaModel: form.marcaModel,
      client: form.client,
      telefonClient: form.telefonClient,
      tipAsigurare: form.tipAsigurare,
      asigurator: form.asigurator,
    };
    onNotify("Date duplicate — completează numărul de dosar nou și verifică restul.", "success");
    onJumpTo(dup);
  };

  const istoricClientVehicul = useMemo(() => {
    if (!Array.isArray(allClaims)) return [];
    const tel = (form.telefonClient || "").trim();
    const vin = (form.vin || "").trim().toUpperCase();
    if (!tel && !vin) return [];
    return allClaims.filter((c) => c && c.id && c.id !== claim?.id && (
      (tel && (c.telefonClient || "").trim() === tel) || (vin && (c.vin || "").trim().toUpperCase() === vin)
    ));
  }, [allClaims, form.telefonClient, form.vin, claim?.id]);

  const isDirty = useMemo(() => {
    if (readOnly) return false;
    if (noteText.trim()) return true;
    if (scanSession) return true;
    try {
      return JSON.stringify(form) !== JSON.stringify(baseline);
    } catch {
      return true;
    }
  }, [form, baseline, noteText, scanSession, readOnly]);

  const requestClose = () => {
    if (!isDirty) {
      setUnsavedPrompt(false);
      onClose?.();
      return;
    }
    setUnsavedPrompt(true);
  };

  const discardAndClose = () => {
    setUnsavedPrompt(false);
    onClose?.();
  };

  const handleSave = (openProgramator = false) => {
    const numarDosar = (form.numarDosar || "").trim();
    const numarInmatriculare = (form.numarInmatriculare || "").trim().toUpperCase();
    const vin = (form.vin || "").trim().toUpperCase();
    const telefonClient = (form.telefonClient || "").trim();

    if (!numarDosar) { onNotify("Introduceți numărul dosarului.", "error"); return false; }
    if (!numarInmatriculare) { onNotify("Introduceți numărul de înmatriculare.", "error"); return false; }
    if (telefonClient && !isValidPhone(telefonClient)) {
      onNotify("Telefonul trebuie să conțină între 7 și 15 cifre.", "error");
      return false;
    }

    const duplicateDosar = Array.isArray(allClaims) ? allClaims.find((c) =>
      c && c.id && c.id !== claim?.id && normalizedText(c.numarDosar) === normalizedText(numarDosar)
    ) : null;
    if (duplicateDosar) {
      onNotify(`Numărul de dosar „${numarDosar}” este deja folosit de un alt dosar.`, "error");
      return false;
    }

    if (isNew && Array.isArray(allClaims)) {
      const duplicat = allClaims.find((c) =>
        c && (c.numarInmatriculare || "").trim().toUpperCase() === numarInmatriculare &&
        c.status !== "facturat"
      );
      if (duplicat) {
        const ok = confirm(`Există deja un dosar activ pentru ${form.numarInmatriculare} (dosarul ${duplicat.numarDosar || "—"}, status „${getStatusDefinition(duplicat.status).label}"). Continui oricum?`);
        if (!ok) return false;
      }
    }

    if (form.status === "programat" && !form.dataProgramare) {
      onNotify("Selectează data și ora programării pentru statusul „Programat”.", "error");
      return false;
    }

    const scheduleChanged = form.dataProgramare !== claim?.dataProgramare;
    const statusToProgramat = form.status === "programat" && claim?.status !== "programat";
    const shouldOpenProgramator =
      form.status === "programat" &&
      Boolean(form.dataProgramare) &&
      (scheduleChanged || statusToProgramat);

    let effectiveStatus = getStatusDefinition(form.status).key;
    if (form.adusaFizic && effectiveStatus === "programat") {
      effectiveStatus = "in_lucru";
    } else if (
      form.dataProgramare &&
      effectiveStatus !== "programat" &&
      shouldPromoteToProgramatOnSchedule({ ...form, status: effectiveStatus })
    ) {
      effectiveStatus = "programat";
    }

    const deliveryState = {
      gataDeRidicare: !!form.gataDeRidicare || !!form.ridicata,
      dataGataRidicare: form.gataDeRidicare || form.ridicata
        ? (form.dataGataRidicare || nowISO())
        : null,
      ridicata: !!form.ridicata,
      dataRidicare: form.ridicata ? (form.dataRidicare || nowISO()) : null,
    };

    const statusChanged = effectiveStatus !== claim.status;
    if (statusChanged && effectiveStatus === "facturat") {
      const faraValori = !form.manopera.tinichigerie.facturat && !form.manopera.vopsitorie.facturat &&
        !form.valoarePieseAudatex && !form.valoareAchizitiePiese;
      if (faraValori) {
        const ok = confirm("Nu ai completat nicio valoare de manoperă sau piese pentru acest dosar. Sigur vrei să-l marchezi ca facturat?");
        if (!ok) return false;
      }
    }

    setUnsavedPrompt(false);
    setSavingLocal(true);
    Promise.resolve(
      onSave({
        ...form,
        ...deliveryState,
        status: effectiveStatus,
        numarDosar,
        numarInmatriculare,
        vin,
        telefonClient,
        dataUltimeiActualizari: nowISO(),
        dataSchimbareStatus: statusChanged ? nowISO() : form.dataSchimbareStatus,
        ...(statusChanged ? { alerteAck: false } : {}),
      }, { openProgramator: openProgramator || shouldOpenProgramator })
    ).finally(() => setSavingLocal(false));
    return true;
  };

  const insertSlashCommand = (prefix) => {
    setNoteText((prev) => (prev.startsWith("/") ? prefix : prefix + prev));
  };

  const removeNote = (id) => setForm((f) => ({ ...f, note: f.note.filter((n) => n.id !== id) }));

  const removeDoc = async (id) => {
    const doc = form.documente.find((d) => d.id === id);
    if (!doc) return;
    if (doc?.path) {
      const { error } = await supabase.storage.from("documente-dosare").remove([doc.path]);
      if (error) {
        onNotify(`Nu am putut șterge documentul „${doc.nume || ""}”: ${error.message}`, "error");
        return;
      }
    }
    const nextDocs = form.documente.filter((d) => d.id !== id);
    setFormMedia({ documente: nextDocs });
    await persistMediaPatch({ removeDocumente: [doc] });
  };

  const handleUploadPoze = async (fileList, categoria = "generale") => {
    const requested = Array.from(fileList || []);
    if (requested.length === 0) return;

    const locMax = MAX_POZE_PER_DOSAR - form.poze.length;
    if (locMax <= 0) {
      onNotify(`Ai atins limita de ${MAX_POZE_PER_DOSAR} poze pentru acest dosar.`, "error");
      return;
    }

    setUploadingPoze(true);
    const files = [];
    const respinse = [];
    for (const file of requested) {
      try {
        let fileToUpload = file;
        if (file.type && file.type.startsWith("image/")) {
          fileToUpload = await compressColorImage(file);
        }
        if (fileToUpload.size > MAX_UPLOAD_SIZE_BYTES) {
          respinse.push(file.name);
          continue;
        }
        if (files.length >= locMax) break;
        files.push(fileToUpload);
      } catch (cErr) {
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          respinse.push(file.name);
          continue;
        }
        if (files.length >= locMax) break;
        files.push(file);
      }
    }

    if (respinse.length) {
      onNotify(`${respinse.length} fișier(e) peste ${MAX_UPLOAD_SIZE_MB}MB au fost ignorate: ${respinse.join(", ")}`, "error");
    }
    if (requested.length > locMax && files.length === locMax) {
      onNotify(`Doar ${locMax} poze au fost încărcate — limita e ${MAX_POZE_PER_DOSAR}/dosar.`, "error");
    }
    if (files.length === 0) {
      setUploadingPoze(false);
      return;
    }

    const noi = [];
    const claimId = form.id || claim?.id || uid();
    for (const file of files) {
      const path = storagePath(claimId, file);
      const { error } = await supabase.storage.from("poze-dosare").upload(path, file, { upsert: false });
      if (error) { onNotify(`Eroare la încărcarea „${file.name}”: ${error.message}`, "error"); continue; }
      const { data: signed, error: signedError } = await supabase.storage.from("poze-dosare").createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (signedError) {
        await supabase.storage.from("poze-dosare").remove([path]);
        onNotify(`Eroare la generarea linkului pentru „${file.name}”: ${signedError.message}`, "error");
        continue;
      }
      noi.push({ id: uid(), path, url: signed?.signedUrl || "", nume: file.name, categoria, incarcatLa: nowISO() });
    }
    if (noi.length) {
      setFormMedia({ poze: [...noi, ...form.poze] });
      onNotify(`${noi.length} fotografie(i) încărcată(e) în categoria „${categoria}".`, "success");
      await persistMediaPatch({ appendPoze: noi });
    }
    setUploadingPoze(false);
  };

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      await downloadClaimAsZip(form, form.numarDosar);
      onNotify("Arhiva ZIP a fost descărcată cu succes!", "success");
    } catch (err) {
      onNotify(`Eroare la generarea arhivei ZIP: ${err.message}`, "error");
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleUploadDocumente = async (fileList) => {
    const requested = Array.from(fileList || []);
    if (requested.length === 0) return;

    const locMax = MAX_DOCUMENTE_PER_DOSAR - form.documente.length;
    if (locMax <= 0) {
      onNotify(`Ai atins limita de ${MAX_DOCUMENTE_PER_DOSAR} documente pentru acest dosar.`, "error");
      return;
    }

    const files = [];
    const respinse = [];
    for (const file of requested) {
      if (file.size > MAX_UPLOAD_SIZE_BYTES) { respinse.push(file.name); continue; }
      if (files.length >= locMax) break;
      files.push(file);
    }
    if (respinse.length) {
      onNotify(`${respinse.length} fișier(e) peste ${MAX_UPLOAD_SIZE_MB}MB au fost ignorate: ${respinse.join(", ")}`, "error");
    }
    if (requested.length > locMax && files.length === locMax) {
      onNotify(`Doar ${locMax} documente au fost încărcate — limita e ${MAX_DOCUMENTE_PER_DOSAR}/dosar.`, "error");
    }
    if (files.length === 0) return;

    setUploadingDocumente(true);
    const noi = [];
    const claimId = form.id || claim?.id || uid();
    for (const file of files) {
      const path = storagePath(claimId, file);
      const { error } = await supabase.storage.from("documente-dosare").upload(path, file, { upsert: false });
      if (error) { onNotify(`Eroare la încărcarea „${file.name}”: ${error.message}`, "error"); continue; }
      const { data: signed, error: signedError } = await supabase.storage.from("documente-dosare").createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (signedError) {
        await supabase.storage.from("documente-dosare").remove([path]);
        onNotify(`Eroare la generarea linkului pentru „${file.name}”: ${signedError.message}`, "error");
        continue;
      }
      noi.push({ id: uid(), path, url: signed?.signedUrl || "", nume: file.name, incarcatLa: nowISO() });
    }
    if (noi.length) {
      setFormMedia({ documente: [...noi, ...form.documente] });
      onNotify(`${noi.length} document(e) încărcat(e).`, "success");
      await persistMediaPatch({ appendDocumente: noi });
    }
    setUploadingDocumente(false);
  };

  const handleStartScanSession = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f?.type?.startsWith("image/"));
    if (files.length === 0) return;

    setUploadingDocumente(true);
    try {
      const urls = [];
      for (const file of files) urls.push(await fileToDataUrl(file));
      const defaultName = `Scan_${form.numarInmatriculare || "Dosar"}_${todayISO()}`;
      setScanSession({
        fileName: defaultName,
        pages: [],
        saveAsPdf: true,
        saveAsPhotos: false,
      });
      setCropMode("scan");
      setCropImageSrc(urls[0]);
      setCropQueue(urls.slice(1));
    } catch (err) {
      onNotify(err.message, "error");
    } finally {
      setUploadingDocumente(false);
    }
  };

  const handleAddPageToScan = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f?.type?.startsWith("image/"));
    if (files.length === 0) return;

    try {
      const urls = [];
      for (const file of files) urls.push(await fileToDataUrl(file));
      setCropMode("scan");
      setCropImageSrc(urls[0]);
      setCropQueue(urls.slice(1));
    } catch (err) {
      onNotify(err.message, "error");
    }
  };

  const handleSaveMultiPageScan = async () => {
    if (!scanSession || scanSession.pages.length === 0) return;
    if (!scanSession.saveAsPdf && !scanSession.saveAsPhotos) {
      onNotify("Te rog selectează cel puțin o opțiune de salvare (PDF sau Poze).", "error");
      return;
    }

    setUploadingDocumente(true);
    setUploadingPoze(true);
    try {
      if (scanSession.saveAsPdf) {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ unit: "pt", format: "a4" });
        for (let i = 0; i < scanSession.pages.length; i++) {
          const pageDataUrl = scanSession.pages[i];
          const img = await new Promise((resolve, reject) => {
            const o = new Image();
            o.onload = () => resolve(o);
            o.onerror = () => reject(new Error("Eroare la încărcarea paginii."));
            o.src = pageDataUrl;
          });

          const orientation = img.width > img.height ? "l" : "p";
          if (i > 0) {
            pdf.addPage([img.width, img.height], orientation);
          } else {
            pdf.deletePage(1);
            pdf.addPage([img.width, img.height], orientation);
          }
          pdf.addImage(pageDataUrl, "JPEG", 0, 0, img.width, img.height);
        }

        const blob = pdf.output("blob");
        const name = (scanSession.fileName || "scan").trim().replace(/\.pdf$/i, "");
        const pdfFile = new File([blob], `${name}.pdf`, { type: "application/pdf" });
        await handleUploadDocumente([pdfFile]);
      }

      if (scanSession.saveAsPhotos) {
        const photoFiles = [];
        const baseName = (scanSession.fileName || "scan").trim().replace(/\.pdf$/i, "");
        for (let i = 0; i < scanSession.pages.length; i++) {
          const pageDataUrl = scanSession.pages[i];
          const res = await fetch(pageDataUrl);
          const blob = await res.blob();
          const photoFile = new File([blob], `${baseName}_pagina_${i + 1}.jpg`, { type: "image/jpeg" });
          photoFiles.push(photoFile);
        }
        await handleUploadPoze(photoFiles);
      }

      setScanSession(null);
    } catch (err) {
      onNotify(err.message, "error");
    } finally {
      setUploadingDocumente(false);
      setUploadingPoze(false);
    }
  };

  const removePoza = async (poza) => {
    if (poza?.path) {
      const { error } = await supabase.storage.from("poze-dosare").remove([poza.path]);
      if (error) {
        onNotify(`Nu am putut șterge fotografia „${poza.nume || ""}”: ${error.message}`, "error");
        return;
      }
    }
    const nextPoze = form.poze.filter((p) => p.id !== poza.id);
    setFormMedia({ poze: nextPoze });
    await persistMediaPatch({ removePoze: [poza] });
  };

  return (
    <div
      className={modalOverlayClass(desktopUi, { dense: true, layer: "front" })}
      {...modalOverlayProps(desktopUi, themeId)}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
        className={modalPanelClass(
          desktopUi,
          // Fixed height on desktop so Date/Poze/Financiar/Istoric don't resize the window;
          // only the body scrolls (content grows downward / scrolls up).
          "app-fixed-shell-modal relative w-full h-full sm:h-[94vh] sm:max-h-[94vh] sm:max-w-5xl rounded-none sm:rounded-lg flex flex-col overflow-hidden bg-[var(--app-surface)] sm:border sm:border-[var(--app-border)]"
        )}
      >
        
        {/* Top Bar Navigation & Actions */}
        <div 
          onMouseDown={handleMouseDown}
          className={modalHeaderClass(
            desktopUi,
            "flex items-center justify-between px-3 py-2 select-none cursor-move"
          )}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <FileText size={16} className={`shrink-0 ${desktopUi ? "text-[var(--app-muted)]" : "text-white/80"}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`font-semibold text-[13px] tracking-tight truncate ${desktopUi ? "text-[var(--app-text)]" : "text-white"}`}>
                  {isNew ? "Dosar Nou" : (form.numarDosar ? `Dosar ${form.numarDosar}` : "Dosar Fără Număr")}
                </span>
                {/* Single status chip — elimină nevoia de badge-uri duplicate */}
                {!isNew && (() => {
                  const sd = getStatusDefinition(form.status);
                  const phaseClass = {
                    start: "bg-[var(--app-surface-muted)] text-[var(--app-text)]",
                    eval: "bg-[var(--app-surface-muted)] text-[var(--app-text)]",
                    lucru: "bg-[var(--app-warning-muted)] text-[var(--app-warning)]",
                    final: "bg-[var(--app-success-muted)] text-[var(--app-success)]",
                  };
                  return (
                    <span
                      className={`shrink-0 text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md ${phaseClass[sd.phase] || phaseClass.start}`}
                    >
                      {sd.num}/9 · {sd.label}
                    </span>
                  );
                })()}
                {form.blocat && (
                  <span className="shrink-0 inline-flex items-center gap-0.5 text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md bg-[var(--app-danger)] text-[var(--app-danger-text)]">
                    <AlertOctagon size={10} /> Blocat
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-mono flex items-center gap-1 truncate ${desktopUi ? "text-[var(--app-muted)]" : "text-[var(--app-muted-2)]"}`}>
                <Car size={10} className="shrink-0 opacity-70" />
                <span className="truncate">{form.numarInmatriculare || "Fără nr."} · {form.marcaModel || "Model neprecizat"}</span>
              </span>
              {!isNew && (
                <ClaimAuditMeta
                  claim={form}
                  compact
                  className={`mt-0.5 ${desktopUi ? "" : "text-white/70 [&_span.font-semibold]:text-white/90"}`}
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isNew && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (form.blocat) {
                      set("blocat", false);
                      set("motivBlocare", "");
                    } else {
                      const motiv = window.prompt("Motiv blocare dosar:", form.motivBlocare || "");
                      if (motiv === null) return;
                      set("blocat", true);
                      set("motivBlocare", motiv.trim() || "Nespecificat");
                    }
                  }}
                  className={`flex items-center gap-1 text-[10.5px] font-semibold border rounded-lg px-2 py-1 transition-colors cursor-pointer ${
                    form.blocat
                      ? "text-[var(--app-danger-text)] bg-[var(--app-danger)] border-[var(--app-danger)] hover:bg-[var(--app-danger-hover)]"
                      : desktopUi
                        ? "text-[var(--app-muted)] hover:text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
                        : "text-white/80 hover:text-white border-white/20 hover:bg-white/10"
                  }`}
                  title={form.blocat ? "Deblochează dosarul" : "Marchează dosarul ca blocat"}
                >
                  <AlertOctagon size={12} />
                  <span className="hidden md:inline">{form.blocat ? " Deblochează" : " Blochează"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDuplicate}
                  className="flex items-center gap-1 text-white/80 hover:text-white text-[10.5px] font-semibold border border-white/20 rounded-lg px-2 py-1 hover:bg-white/10 transition-colors cursor-pointer"
                  title="Duplică / Copiază datele acestui dosar"
                >
                  <Copy size={12} /><span className="hidden md:inline"> Copiază</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  className="flex items-center gap-1 text-white/80 hover:text-white text-[10.5px] font-semibold border border-white/20 rounded-lg px-2 py-1 hover:bg-white/10 transition-colors cursor-pointer"
                  title="Descarcă toate pozele și documentele într-o arhivă ZIP"
                >
                  {downloadingZip ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  <span className="hidden md:inline"> ZIP</span>
                </button>

                {/* Print / PDF — icon-only printer */}
                <div ref={pdfMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setPdfMenuOpen((v) => !v)}
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors cursor-pointer ${
                      desktopUi
                        ? "text-[var(--app-muted)] hover:text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
                        : "text-white/80 hover:text-white border-white/20 hover:bg-white/10"
                    }`}
                    title="Printează / exportă PDF"
                    aria-label="Printează / exportă PDF"
                    aria-expanded={pdfMenuOpen}
                    aria-haspopup="menu"
                  >
                    <Printer size={14} />
                  </button>
                  {pdfMenuOpen && (
                    <div
                      role="menu"
                      className={`absolute right-0 top-[calc(100%+0.3rem)] z-[70] min-w-[11rem] rounded-lg border py-1 shadow-lg ${
                        desktopUi
                          ? "bg-[var(--app-surface)] border-[var(--app-border)]"
                          : "bg-[var(--app-surface-muted)] border-white/20"
                      }`}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold ${
                          desktopUi
                            ? "text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
                            : "text-white hover:bg-white/10"
                        }`}
                        onClick={async () => {
                          setPdfMenuOpen(false);
                          await generateazaPDF(form, istoric, loadCachedBranding());
                        }}
                      >
                        <FileText size={13} /> Proces-Verbal General
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold ${
                          desktopUi
                            ? "text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
                            : "text-white hover:bg-white/10"
                        }`}
                        onClick={async () => {
                          setPdfMenuOpen(false);
                          await generateazaFisaIntrareService(form);
                        }}
                      >
                        <FileText size={13} /> Fișă Intrare Service
                      </button>
                      {resolveCerereDespagubireKind(form.asigurator) === "omniasig" ? (
                        <button
                          type="button"
                          role="menuitem"
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold ${
                            desktopUi
                              ? "text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
                              : "text-white hover:bg-white/10"
                          }`}
                          onClick={async () => {
                            setPdfMenuOpen(false);
                            await generateazaCerereDespagubireOmniasig(form);
                          }}
                        >
                          <FileText size={13} /> Cerere Omniasig
                        </button>
                      ) : null}
                      {resolveCerereDespagubireKind(form.asigurator) === "asirom" ? (
                        <button
                          type="button"
                          role="menuitem"
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold ${
                            desktopUi
                              ? "text-[var(--app-muted)] hover:bg-[var(--app-surface-2)]"
                              : "text-white/50 hover:bg-white/10"
                          }`}
                          disabled
                          title="Trimite tipizatul Asirom ca să activăm printul"
                          onClick={() => setPdfMenuOpen(false)}
                        >
                          <FileText size={13} /> Cerere Asirom (în curând)
                        </button>
                      ) : null}
                      {form.masinaSchimb ? (
                        <button
                          type="button"
                          role="menuitem"
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold ${
                            desktopUi
                              ? "text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
                              : "text-white hover:bg-white/10"
                          }`}
                          onClick={() => {
                            setPdfMenuOpen(false);
                            generateazaProcesVerbalMasinaSchimb(form);
                          }}
                        >
                          <Car size={13} /> PV Auto la Schimb
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={requestClose}
              className={`p-1 rounded-lg transition-colors ml-1 cursor-pointer ${
                desktopUi
                  ? "text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
              aria-label="Închide"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab track — same pill language as Setări */}
        <div className="m-settings-tabs m-settings-tabs--pill flex shrink-0 overflow-x-auto scrollbar-thin z-30">
          {[
            { id: "general", label: desktopUi ? "Date Dosar & Vehicul" : "Dosar", icon: FileText },
            {
              id: "media",
              label: desktopUi ? "Poze & Documente" : "Media",
              icon: ImageIcon,
              badge:
                (Array.isArray(form.poze) ? form.poze.length : 0) +
                (Array.isArray(form.documente) ? form.documente.length : 0),
            },
            { id: "financial", label: desktopUi ? "Financiar & Audatex" : "Financiar", icon: Wallet },
            {
              id: "history",
              label: desktopUi ? "Istoric & Notițe" : "Istoric",
              icon: History,
              badge: Array.isArray(form.note) ? form.note.length : 0,
            },
          ].map(({ id, label, icon: Icon, badge }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`m-settings-tab flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold transition-all whitespace-nowrap shrink-0 border-0 ${
                  active ? "is-active" : ""
                }`}
              >
                <Icon size={14} />
                <span>{label}</span>
                {badge > 0 && (
                  <span className={`m-settings-tab-badge px-1.5 py-0.5 text-[10px] font-black rounded-full ${active ? "is-active" : ""}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {readOnly && (
          <div className="px-4 py-1.5 bg-[var(--app-border-soft)] text-[var(--app-muted)] text-[11px] flex items-center gap-1.5 shrink-0 border-b border-[var(--app-border)] font-medium">
            <ShieldCheck size={13} className="text-[var(--app-accent)]" /> Vizualizare restricționată — poți citi, nu edita.
          </div>
        )}

        {/* MAIN BODY — sole scroll region; header/tabs/footer stay put across tabs */}
        <div className="app-claim-modal-body app-fixed-shell-body flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[var(--app-surface-2)]">
          <fieldset disabled={readOnly} className="border-0 m-0 p-0 min-w-0 min-h-full">
            <div className="p-3 pb-5 space-y-3 font-sans">

              {/* ========================================================================= */}
              {/* TAB 1: DATE DOSAR & VEHICUL                                               */}
              {/* ========================================================================= */}
              {activeTab === "general" && (
                <div className="space-y-3">
                  {/* ID — discret, vizibil doar la hover sau pe desktop */}
                  <div className="flex items-center justify-end">
                    <span className="text-[9.5px] font-mono text-[#B0A99A] hover:text-[var(--app-muted)] transition-colors select-all cursor-help" title="ID intern dosar">
                      #{form.id?.slice(0, 8) || "Nou"}
                    </span>
                  </div>

                  {/* Grid cu 2 Coloane Spațioase: Date Dosar & Date Vehicul */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">

                    {/* COLOANA 1: DATE DOSAR */}
                    <div className="bg-white border border-[var(--app-border)] rounded-xl p-3 space-y-2 shadow-2xs">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--app-muted)] border-b border-[var(--app-border)]/60 pb-1 flex items-center gap-1.5">
                        <FileText size={13} className="text-[var(--app-muted)]" /> 1. Date Dosar
                      </div>

                      {/* 1. Nr. Dosar Daună */}
                      <div>
                        <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-0.5 flex items-center gap-1">
                          <FileText size={12} className="text-[var(--app-muted)]" /> Nr. Dosar Daună
                        </label>
                        <input
                          className="w-full font-bold text-[12px] p-1.5 border border-[var(--app-border)] rounded-lg bg-white uppercase text-[var(--app-text-strong)] focus:border-[var(--app-muted)]"
                          value={form.numarDosar}
                          onChange={(e) => set("numarDosar", e.target.value.toUpperCase())}
                          placeholder="ex: 2026-00451"
                          required
                        />
                      </div>

                      {/* Dată Deschidere Dosar */}
                      <div>
                        <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-0.5 flex items-center gap-1">
                          <Calendar size={12} className="text-[var(--app-muted)]" /> Dată Deschidere / Intrare Dosar
                        </label>
                        <DatePickerInput
                          value={form.dataDeschiderii}
                          onChange={(v) => set("dataDeschiderii", v)}
                          withTime={false}
                          placeholder="zi/lună/an"
                        />
                      </div>

                      {/* Asigurător & Tip */}
                      <div>
                        <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-0.5 flex items-center gap-1">
                          <ShieldCheck size={12} className="text-[var(--app-muted)]" /> Asigurător &amp; Tip Asigurare
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            className="col-span-1 font-bold text-[11.5px] p-1.5 border border-[var(--app-border)] rounded-lg bg-white text-[var(--app-text-strong)]"
                            value={form.tipAsigurare}
                            onChange={(e) => {
                              const val = e.target.value;
                              set("tipAsigurare", val);
                              if (val === "Fără asigurare") {
                                set("asigurator", "");
                              }
                            }}
                          >
                            {INSURANCE_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          <select
                            disabled={form.tipAsigurare === "Fără asigurare"}
                            className={`col-span-2 text-[11.5px] p-1.5 border border-[var(--app-border)] rounded-lg bg-white font-semibold text-[var(--app-text-strong)] ${
                              form.tipAsigurare === "Fără asigurare" ? "opacity-50 bg-[var(--app-border-soft)] cursor-not-allowed" : ""
                            }`}
                            value={form.asigurator}
                            onChange={(e) => set("asigurator", e.target.value)}
                          >
                            <option value="">{form.tipAsigurare === "Fără asigurare" ? "-- Fără asigurător --" : "-- Societate Asigurare --"}</option>
                            {(Array.isArray(insurersList) && insurersList.length > 0 ? insurersList : INSURERS).map((i) => <option key={i} value={i}>{i}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Dată Comandă Piese — detalii în coloana Date Dosar */}
                      {isPieseComandateStatus(form.status) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-xl">
                            <label className="block text-[10.5px] font-bold text-[var(--app-warning)] mb-0.5 flex items-center gap-1">
                              <CalendarClock size={12} className="text-[var(--app-warning)]" /> Dată Comandă Piese
                            </label>
                            <DatePickerInput
                              value={form.dataComandaPiese}
                              onChange={(v) => set("dataComandaPiese", v)}
                              withTime={false}
                              placeholder="zi/lună/an"
                            />
                          </div>
                          <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-xl">
                            <label className="block text-[10.5px] font-bold text-[var(--app-warning)] mb-0.5 flex items-center gap-1">
                              <Calendar size={12} className="text-[var(--app-warning)]" /> Termen Livrare Piese
                            </label>
                            <DatePickerInput
                              value={form.termenLivrarePiese}
                              onChange={(v) => set("termenLivrarePiese", v)}
                              withTime={false}
                              placeholder="zi/lună/an"
                            />
                          </div>
                        </div>
                      )}

                      {form.blocat && (
                        <div className="p-2 bg-red-50/80 border border-red-200 rounded-xl space-y-1">
                          <label className="block text-[10.5px] font-bold text-[var(--app-danger)] flex items-center gap-1">
                            <AlertOctagon size={12} /> Motiv blocare dosar
                          </label>
                          <input
                            className="w-full text-[11.5px] p-1.5 border border-red-200 rounded-lg bg-white font-semibold text-[var(--app-text-strong)]"
                            placeholder="ex: Litigiu, așteptare deviz..."
                            value={form.motivBlocare || ""}
                            onChange={(e) => set("motivBlocare", e.target.value)}
                          />
                        </div>
                      )}

                      {/* Linii reparații */}
                      <div className="space-y-1.5 border-t border-[var(--app-border)]/60 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10.5px] font-extrabold text-[var(--app-muted)] uppercase flex items-center gap-1">
                            <Wrench size={12} className="text-[var(--app-muted)]" /> Operațiuni de efectuat (linii &amp; bife)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const newList = [...(form.operatiuni || []), { id: uid(), piesa: "", inl: false, rev: false, rep: false, uni: false }];
                              set("operatiuni", newList);
                            }}
                            className="text-[10px] font-extrabold text-[var(--app-muted)] hover:bg-[var(--app-border-soft)] px-2 py-0.5 rounded border border-[var(--app-border)] flex items-center gap-1"
                          >
                            + Adaugă Linie
                          </button>
                        </div>

                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {(!form.operatiuni || form.operatiuni.length === 0) ? (
                            <div className="text-[10.5px] text-[var(--app-muted)] italic p-2 border border-dashed border-[var(--app-border)] rounded-lg text-center">
                              Nicio linie adăugată. Apasă pe „+ Adaugă Linie” de mai sus.
                            </div>
                          ) : (
                            form.operatiuni.map((op, idx) => (
                              <div key={op.id || idx} className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[var(--app-border)]">
                                <input
                                  className="flex-1 font-semibold text-[11px] px-1.5 py-0.5 border border-[var(--app-border)] rounded uppercase text-[var(--app-text-strong)]"
                                  placeholder="ex: Oglindă ext. stanga, Bara față..."
                                  value={op.piesa || ""}
                                  onChange={(e) => {
                                    const newList = [...form.operatiuni];
                                    newList[idx] = { ...newList[idx], piesa: e.target.value.toUpperCase() };
                                    set("operatiuni", newList);
                                    set("ceEsteDeReparat", newList.map((o) => o.piesa).filter(Boolean).join(", "));
                                  }}
                                />
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <label className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border ${op.inl ? "bg-[#B8791E] text-white border-[#B8791E]" : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-[var(--app-border)] hover:bg-gray-100"}`} title="Înlocuire">
                                    <input type="checkbox" checked={!!op.inl} onChange={(e) => { const newList = [...form.operatiuni]; newList[idx] = { ...newList[idx], inl: e.target.checked }; set("operatiuni", newList); }} className="hidden" /> INL
                                  </label>
                                  <label className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border ${op.rev ? "bg-[var(--app-muted)] text-white border-[var(--app-muted)]" : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-[var(--app-border)] hover:bg-gray-100"}`} title="Revopsire">
                                    <input type="checkbox" checked={!!op.rev} onChange={(e) => { const newList = [...form.operatiuni]; newList[idx] = { ...newList[idx], rev: e.target.checked }; set("operatiuni", newList); }} className="hidden" /> REV
                                  </label>
                                  <label className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border ${op.rep ? "bg-[var(--app-success)] text-white border-[var(--app-success)]" : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-[var(--app-border)] hover:bg-gray-100"}`} title="Reparație">
                                    <input type="checkbox" checked={!!op.rep} onChange={(e) => { const newList = [...form.operatiuni]; newList[idx] = { ...newList[idx], rep: e.target.checked }; set("operatiuni", newList); }} className="hidden" /> REP
                                  </label>
                                  <label className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border ${op.uni ? "bg-[var(--app-text)] text-white border-[var(--app-text)]" : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-[var(--app-border)] hover:bg-gray-100"}`} title="Demontare / Montare">
                                    <input type="checkbox" checked={!!op.uni} onChange={(e) => { const newList = [...form.operatiuni]; newList[idx] = { ...newList[idx], uni: e.target.checked }; set("operatiuni", newList); }} className="hidden" /> UNI
                                  </label>
                                  <button type="button" onClick={() => { const newList = form.operatiuni.filter((_, i) => i !== idx); set("operatiuni", newList); set("ceEsteDeReparat", newList.map((o) => o.piesa).filter(Boolean).join(", ")); }} className="p-1 text-[var(--app-danger)] hover:bg-red-50 rounded-lg transition-colors ml-0.5" title="Șterge linia">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* COLOANA 2: VEHICUL, PROPRIETAR & DELEGAT */}
                    <div className="bg-white border border-[var(--app-border)] rounded-xl p-3 space-y-2.5 shadow-2xs">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--app-muted)] border-b border-[var(--app-border)]/60 pb-1 flex items-center gap-1.5">
                        <Car size={13} className="text-[var(--app-muted)]" /> 2. Date Vehicul, Proprietar &amp; Delegat
                      </div>

                      {/* Nr. Înmatriculare */}
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
                          <Car size={13} className="text-[var(--app-muted)]" /> Nr. Înmatriculare
                        </label>
                        <input
                          className="w-full font-mono font-bold text-[12.5px] p-1.5 border border-[var(--app-border)] rounded-lg bg-white uppercase text-[var(--app-text-strong)] focus:border-[var(--app-muted)]"
                          value={form.numarInmatriculare}
                          onChange={(e) => set("numarInmatriculare", e.target.value.toUpperCase())}
                          placeholder="ex: B111AAA"
                          required
                        />
                      </div>

                      {/* Serie Șasiu (VIN) */}
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
                          <Tag size={13} className="text-[var(--app-muted)]" /> Serie Șasiu (VIN 17 caractere)
                        </label>
                        <input
                          className="w-full font-mono text-[12px] p-1.5 border border-[var(--app-border)] rounded-lg bg-white uppercase text-[var(--app-text-strong)] focus:border-[var(--app-muted)]"
                          value={form.vin}
                          onChange={(e) => set("vin", e.target.value.toUpperCase())}
                          maxLength={17}
                          placeholder="Cod VIN 17 caractere"
                        />
                      </div>

                      {/* Marcă & Model */}
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
                          <Car size={13} className="text-[var(--app-muted)]" /> Marcă &amp; Model Vehicul
                        </label>
                        <input
                          className="w-full text-[12px] p-1.5 border border-[var(--app-border)] rounded-lg bg-white uppercase text-[var(--app-text-strong)] focus:border-[var(--app-muted)]"
                          value={form.marcaModel}
                          onChange={(e) => set("marcaModel", e.target.value.toUpperCase())}
                          placeholder="ex: VOLKSWAGEN PASSAT 2.0 TDI"
                        />
                      </div>

                      {/* Proprietar & Delegat */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
                            <UserIcon size={13} className="text-[var(--app-muted)]" /> Proprietar Auto
                          </label>
                          <input
                            className="w-full font-semibold text-[12px] p-1.5 border border-[var(--app-border)] rounded-lg bg-white uppercase text-[var(--app-text-strong)] focus:border-[var(--app-muted)]"
                            value={form.client}
                            onChange={(e) => set("client", e.target.value.toUpperCase())}
                            placeholder="Nume proprietar auto"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
                            <UserIcon size={13} className="text-[var(--app-muted)]" /> Delegat
                          </label>
                          <input
                            className="w-full text-[12px] p-1.5 border border-[var(--app-border)] rounded-lg bg-white uppercase text-[var(--app-text-strong)] focus:border-[var(--app-muted)]"
                            value={form.delegat || ""}
                            onChange={(e) => set("delegat", e.target.value.toUpperCase())}
                            placeholder="Nume delegat (opțional)"
                          />
                        </div>
                      </div>

                      {/* Telefon contact */}
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
                          <Phone size={13} className="text-[var(--app-muted)]" /> Telefon Contact
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            className="flex-1 font-mono text-[11.5px] p-1.5 border border-[var(--app-border)] rounded-lg bg-white"
                            type="tel"
                            placeholder="07xx xxx xxx"
                            value={form.telefonClient}
                            onChange={(e) => set("telefonClient", e.target.value)}
                          />
                          {form.telefonClient && (
                            <>
                              <a href={telLink(form.telefonClient)} title="Sună client" className="shrink-0 p-1.5 rounded-lg bg-white border border-[var(--app-border)] hover:bg-[var(--app-border-soft)] text-[var(--app-muted)] transition-colors"><Phone size={12} /></a>
                              <a href={waLink(form.telefonClient, `Buna ziua! Va contactam de la ${loadCachedBranding()?.atelierNume || "service"} referitor la dosarul dvs. ${form.numarDosar || ""} (${form.numarInmatriculare || ""}).`)} target="_blank" rel="noreferrer" title="WhatsApp" className="shrink-0 p-1.5 rounded-lg bg-[var(--app-success-muted)] border border-[var(--app-success)]/30 hover:bg-[#D3E8D5] text-[var(--app-success)] transition-colors"><MessageCircle size={12} /></a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* BARA INTERACTIVĂ DE STADII FLUX */}
                    <div className="col-span-1 md:col-span-2 bg-white border border-[var(--app-border)] rounded-xl p-2.5 shadow-2xs space-y-2">
                      {/* 9 Segmented Progress Bar */}
                      <div className="flex items-center gap-1 h-2.5 w-full bg-[var(--app-border-soft)] rounded-full overflow-hidden p-0.5">
                        {STATUSES.map((s, idx) => {
                          const curIdx = Math.max(0, STATUSES.findIndex((x) => x.key === form.status));
                          const isDone = idx < curIdx;
                          const isCurrent = idx === curIdx;
                          const phaseColor = getPhaseColors(s.phase)?.bar || "var(--app-muted)";

                          return (
                            <button
                              key={s.key}
                              type="button"
                              onClick={() => {
                                setForm((f) => applyClaimStatusChange(f, s.key));
                              }}
                              title={`${s.num}. ${s.label}`}
                              className="h-full flex-1 rounded-xs transition-all cursor-pointer hover:opacity-90"
                              style={{
                                backgroundColor: isDone || isCurrent ? phaseColor : "#D1CDC0",
                                opacity: isCurrent ? 1 : isDone ? 0.75 : 0.3,
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* Status Label — simplificat, fără text redundant */}
                      <div className="flex items-center justify-between text-[11.5px] pt-0.5">
                        <span className="text-[10px] text-[var(--app-muted)] font-medium">
                          Etapa {Math.max(1, STATUSES.findIndex((s) => s.key === getStatusDefinition(form.status).key) + 1)} din {STATUSES.length} — click pe segment pentru a schimba
                        </span>

                        <select
                          value={form.status}
                          onChange={(e) => {
                            setForm((f) => applyClaimStatusChange(f, e.target.value));
                          }}
                          className="font-bold text-[11.5px] py-1 px-2.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface-2)] text-[var(--app-text-strong)] focus:border-[var(--app-muted)] cursor-pointer"
                        >
                          {STATUSES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {String(s.num).padStart(2, "0")}. {s.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {form.status === "programat" && (
                        <ClaimScheduleFields
                          dataProgramare={form.dataProgramare}
                          readOnly={readOnly}
                          onChange={(iso) => set("dataProgramare", iso)}
                        />
                      )}

                      {isPieseComandateStatus(form.status) && (
                        <MobilePieseSositeRow
                          claim={form}
                          canEdit={!readOnly}
                          onToggle={(_c, val) => set("pieseSosite", val)}
                          onSchedule={(_c, iso) => {
                            setForm((f) => applyClaimStatusChange({
                              ...f,
                              pieseSosite: true,
                              dataProgramare: iso,
                            }, "programat"));
                            onNotify?.(
                              `Programare setată: ${String(iso).slice(0, 10)} ${String(iso).slice(11, 16) || ""} — salvează dosarul.`.trim(),
                              "success"
                            );
                            return true;
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* STARE FIZICĂ & MAȘINĂ LA SCHIMB */}
                  <div className="grid md:grid-cols-2 gap-3 pt-1">
                    {/* Stepper Stare Fizică */}
                    <div className="bg-white border border-[var(--app-border)] rounded-xl p-3 space-y-3 shadow-2xs">
                      <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] flex items-center justify-between border-b border-[var(--app-border)] pb-1.5">
                        <span className="flex items-center gap-1.5"><Wrench size={14} /> Stare Fizică &amp; Lucrări</span>
                        {!isNew && (
                          <button type="button" onClick={() => generateazaFisaIntrareService(form)} className="text-[11px] font-semibold text-[var(--app-muted)] hover:underline flex items-center gap-1">
                            <FileDown size={12} /> Fișă service
                          </button>
                        )}
                      </div>

                      {/* Stepper cu 3 casete interactive bidirecționale */}
                      <div className="space-y-2 text-[11.5px]">
                        {/* 1. Adusă fizic */}
                        <label className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${form.adusaFizic ? "bg-amber-50/60 border-amber-300" : "bg-[var(--app-surface-2)] border-[var(--app-border)]"}`}>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!form.adusaFizic}
                              onChange={(e) => setForm((f) => {
                                const checked = e.target.checked;
                                const updates = {
                                  adusaFizic: checked,
                                  dataAdusaFizic: checked ? nowISO() : null,
                                };
                                // Side-effect: adus fizic pe Programat → În lucru
                                if (checked && f.status === "programat") {
                                  updates.status = "in_lucru";
                                  updates.dataSchimbareStatus = nowISO();
                                }
                                return { ...f, ...updates };
                              })}
                              className="rounded border-[var(--app-border)]"
                            />
                            <span className="font-bold text-[var(--app-text-strong)]">1. Vehicul adus fizic în service</span>
                          </div>
                          {form.adusaFizic && (
                            <span className="text-[10px] font-mono text-[var(--app-muted)]">{fmtDateTime(form.dataAdusaFizic)}</span>
                          )}
                        </label>

                        {/* 2. Gata de ridicare */}
                        <label className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${form.gataDeRidicare ? "bg-emerald-50/60 border-emerald-300" : "bg-[var(--app-surface-2)] border-[var(--app-border)]"}`}>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!form.gataDeRidicare}
                              onChange={(e) => toggleGata(e.target.checked)}
                              className="rounded border-[var(--app-border)]"
                            />
                            <span className="font-bold text-[var(--app-text-strong)]">2. Lucrare finalizată (Gata de ridicare)</span>
                          </div>
                          {form.gataDeRidicare && (
                            <span className="text-[10px] font-mono text-[var(--app-success)] font-bold">{fmtDateTime(form.dataGataRidicare)}</span>
                          )}
                        </label>

                        {/* 3. Predată client */}
                        <label className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${form.ridicata ? "bg-blue-50/60 border-blue-300" : "bg-[var(--app-surface-2)] border-[var(--app-border)]"}`}>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!form.ridicata}
                              onChange={(e) => toggleRidicata(e.target.checked)}
                              className="rounded border-[var(--app-border)]"
                            />
                            <span className="font-bold text-[var(--app-text-strong)]">3. Predată clientului</span>
                          </div>
                          {form.ridicata && (
                            <span className="text-[10px] font-mono text-[var(--app-text)] font-bold">{fmtDateTime(form.dataRidicare)}</span>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Mașină la Schimb */}
                    <div className="bg-white border border-[var(--app-border)] rounded-xl p-3 space-y-2 shadow-2xs">
                      <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] flex items-center justify-between border-b border-[var(--app-border)] pb-1.5">
                        <span className="flex items-center gap-1.5"><Car size={14} /> Mașină la Schimb</span>
                        {!isNew && form.masinaSchimb && (
                          <button type="button" onClick={() => generateazaProcesVerbalMasinaSchimb(form)} className="text-[11px] font-semibold text-[var(--app-warning)] hover:underline flex items-center gap-1">
                            <FileDown size={12} /> PV Auto Schimb
                          </button>
                        )}
                      </div>

                      <label className="flex items-center gap-2 text-[11.5px] font-bold text-[var(--app-muted)] cursor-pointer">
                        <input type="checkbox" checked={form.masinaSchimb} onChange={(e) => set("masinaSchimb", e.target.checked)} className="rounded border-[var(--app-border)]" />
                        <span>S-a oferit mașină la schimb (Rent-a-car)</span>
                      </label>

                      {form.masinaSchimb && (
                        <div className="space-y-2 pt-1 border-t border-[var(--app-border)]">
                          <div>
                            <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Model Mașină Oferită</label>
                            <input className="w-full text-[12px] p-1.5 border border-[var(--app-border)] rounded-lg uppercase bg-[var(--app-surface-2)]" placeholder="ex: HYUNDAI I20 (B100ABC)" value={form.masinaSchimbModel || ""} onChange={(e) => set("masinaSchimbModel", e.target.value.toUpperCase())} />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Dată Predare Auto</label>
                              <DatePickerInput value={form.dataPredareMasinaSchimb} onChange={(v) => set("dataPredareMasinaSchimb", v)} withTime={false} placeholder="zi/lună/an" />
                            </div>

                            <div>
                              <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Zile Chirie Audatex</label>
                              <input type="number" min={0} className="w-full p-1.5 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[12px] bg-[var(--app-surface-2)]" value={form.zileChirieAudatex || 0} onChange={(e) => set("zileChirieAudatex", Number(e.target.value) || 0)} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: POZE & DOCUMENTE                                                    */}
              {/* ========================================================================= */}
              {activeTab === "media" && (
                <div className="grid md:grid-cols-2 gap-3">
                  {/* Galerie Poze */}
                  <div className="bg-white border border-[var(--app-border)] rounded-xl p-4 space-y-3 shadow-2xs flex flex-col">
                    <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] flex items-center justify-between border-b border-[var(--app-border)] pb-1.5">
                      <span className="flex items-center gap-1.5"><ImageIcon size={14} /> Galerie Poze ({form.poze.length})</span>
                      <button type="button" onClick={handleDownloadZip} disabled={downloadingZip || form.poze.length === 0} className="text-[11px] font-bold text-[var(--app-muted)] hover:underline flex items-center gap-1 disabled:opacity-40">
                        <Download size={12} /> Descarcă ZIP
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[10.5px] font-bold text-[var(--app-muted)]">Adaugă poze direct în Categorie:</div>
                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        <label className="flex items-center justify-center gap-1 border border-dashed border-[var(--app-border)] rounded-lg p-2 bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] cursor-pointer text-[var(--app-text)] font-semibold text-center">
                          <Car size={12} /> <span>Recepție</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files, "receptie")} />
                        </label>
                        <label className="flex items-center justify-center gap-1 border border-dashed border-[var(--app-border)] rounded-lg p-2 bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] cursor-pointer text-[var(--app-text)] font-semibold text-center">
                          <ClipboardList size={12} /> <span>Reconstatare</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files, "reconstatare")} />
                        </label>
                        <label className="flex items-center justify-center gap-1 border border-dashed border-[var(--app-border)] rounded-lg p-2 bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] cursor-pointer text-[var(--app-text)] font-semibold text-center">
                          <Sparkles size={12} /> <span>Predare</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files, "predare")} />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--app-border)]">
                      <label className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2 text-[11.5px] cursor-pointer transition-all ${uploadingPoze ? "opacity-50 pointer-events-none" : "hover:bg-[var(--app-surface-2)] border-[var(--app-border)] text-[var(--app-muted)] font-bold"}`}>
                        {uploadingPoze ? <><Loader2 size={13} className="animate-spin" /> Se încarcă...</> : <><Upload size={13} /> Galerie generală</>}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files, "generale")} />
                      </label>
                      <label className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2 text-[11.5px] cursor-pointer transition-all ${uploadingPoze ? "opacity-50 pointer-events-none" : "hover:bg-[var(--app-surface-2)] border-[var(--app-border)] text-[var(--app-muted)] font-bold"}`}>
                        {uploadingPoze ? <><Loader2 size={13} className="animate-spin" /> Cameră...</> : <><Car size={13} /> Cameră auto</>}
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleUploadPoze(e.target.files, "generale")} />
                      </label>
                    </div>

                    {form.poze.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1 pt-1">
                        {form.poze.map((p, idx) => (
                          <div key={p.id || idx} className="relative group rounded-lg overflow-hidden border border-[var(--app-border)] bg-black/5 aspect-square">
                            <button type="button" onClick={() => setPreviewPozaIndex(idx)} className="w-full h-full block text-left">
                              <img src={p.url} alt={p.nume} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </button>
                            {p.categoria && p.categoria !== "generale" && (
                              <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded uppercase">
                                {p.categoria}
                              </span>
                            )}
                            <button type="button" onClick={() => removePoza(p)} className="absolute top-1 right-1 bg-black/70 hover:bg-[var(--app-danger)] text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[12px] text-[var(--app-muted)] italic p-8 text-center border border-dashed border-[var(--app-border)] rounded-xl bg-[var(--app-surface-2)]">
                        Nicio fotografie adăugată. Adaugă poze folosind butoanele de mai sus.
                      </div>
                    )}
                  </div>

                  {/* Documente PDF & Scaner Pro */}
                  <div className="bg-white border border-[var(--app-border)] rounded-xl p-4 space-y-3 shadow-2xs flex flex-col">
                    <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] flex items-center justify-between border-b border-[var(--app-border)] pb-1.5">
                      <span className="flex items-center gap-1.5"><FolderOpen size={14} /> Documente PDF &amp; Scanate ({form.documente.length})</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2.5 text-[12px] cursor-pointer transition-all ${uploadingDocumente ? "opacity-50 pointer-events-none" : "hover:bg-[var(--app-surface-2)] border-[var(--app-muted)]/40 text-[var(--app-muted)] font-bold"}`}>
                        {uploadingDocumente ? <><Loader2 size={13} className="animate-spin" /> Se încarcă...</> : <><Upload size={13} /> Încarcă documente</>}
                        <input type="file" multiple className="hidden" onChange={(e) => handleUploadDocumente(e.target.files)} />
                      </label>
                      <label className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2.5 text-[12px] cursor-pointer transition-all ${uploadingDocumente ? "opacity-50 pointer-events-none" : "hover:bg-[var(--app-surface-2)] border-[var(--app-accent)]/40 text-[var(--app-warning)] font-bold"}`}>
                        {uploadingDocumente ? <><Loader2 size={13} className="animate-spin" /> Cameră...</> : <><FileText size={13} /> Scanează &amp; Crop Pro</>}
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setCropMode("document"); const reader = new FileReader(); reader.onload = (ev) => setCropImageSrc(ev.target.result); reader.readAsDataURL(file); } e.target.value = ""; }} />
                      </label>
                    </div>

                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {form.documente.map((d) => (
                        <div key={d.id} className="flex items-center justify-between bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-3 py-2 text-[12px]">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText size={14} className="text-[var(--app-muted)] shrink-0" />
                            <a href={d.url || d.link} target="_blank" rel="noreferrer" className="text-[var(--app-text)] font-semibold hover:underline truncate flex-1">{d.nume}</a>
                          </div>
                          <button type="button" onClick={() => removeDoc(d.id)} className="text-[var(--app-danger)] hover:opacity-70 ml-2 p-1"><Trash2 size={13} /></button>
                        </div>
                      ))}
                      {form.documente.length === 0 && (
                        <div className="text-[12px] text-[var(--app-muted)] italic p-8 text-center border border-dashed border-[var(--app-border)] rounded-xl bg-[var(--app-surface-2)]">
                          Niciun document atașat.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
{/* ========================================================================= */}
              {/* TAB 3: FINANCIAR & AUDATEX                                                */}
              {/* ========================================================================= */}
              {activeTab === "financial" && (
                <div className="space-y-3">
                  {/* Secțiunea 1: Valori Deviz Audatex, Accept Plată & Franșiză */}
                  <div className="bg-white border border-[var(--app-border)] rounded-xl p-4 space-y-3 shadow-2xs">
                    <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] border-b border-[var(--app-border)] pb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Wallet size={15} className="text-[var(--app-accent)]" /> 1. Valori Deviz Audatex, Accept Plată &amp; Franșiză</span>
                      <span className="text-[10.5px] font-mono font-semibold text-[var(--app-muted)]">TOATE SUMELE ÎN LEI (FĂRĂ TVA)</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
                      <div>
                        <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-1">Deviz Audatex (lei)</label>
                        <input
                          type="number"
                          min={0}
                          className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[12.5px] bg-white text-[var(--app-text-strong)]"
                          value={form.valoareDevizAudatex || 0}
                          onChange={(e) => set("valoareDevizAudatex", Number(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-[var(--app-success)] mb-1">Valoare Accept Plată (lei)</label>
                        <input
                          type="number"
                          min={0}
                          className="w-full p-2 border border-[var(--app-success)]/40 rounded-lg font-mono font-extrabold text-[12.5px] bg-[var(--app-success-muted)]/40 text-[var(--app-success)]"
                          value={financial.valoareAcceptPlata || form.valoareAcceptataReglata || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setForm((f) => ({
                              ...f,
                              valoareAcceptataReglata: val,
                              financiar: { ...(f.financiar || {}), valoareAcceptPlata: val }
                            }));
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-[var(--app-danger)] mb-1">Valoare Franșiză (lei)</label>
                        <input
                          type="number"
                          min={0}
                          className="w-full p-2 border border-[var(--app-danger)]/30 rounded-lg font-mono font-bold text-[12.5px] bg-[#FBEAE9]/40 text-[#8C2E2E]"
                          value={financial.valoareFransiza || 0}
                          onChange={(e) => setFinancial("valoareFransiza", Number(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-1">Nr. Factură &amp; Stadiu</label>
                        <input
                          type="text"
                          className="w-full p-2 border border-[var(--app-border)] rounded-lg font-bold text-[12px] bg-white"
                          placeholder="ex: FACT-1029"
                          value={financial.numarFactura || form.numarFactura || ""}
                          onChange={(e) => setFinancial("numarFactura", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Secțiunea 2: Defalcare Manoperă & Cost Piese Audatex vs Service */}
                  <div className="bg-white border border-[var(--app-border)] rounded-xl p-4 space-y-3 shadow-2xs">
                    <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] border-b border-[var(--app-border)] pb-1.5 flex items-center justify-between">
                      <span>2. Defalcare Manoperă &amp; Preț Piese (Audatex vs. Service)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Coloana Stânga: Manoperă & Piese Audatex */}
                      <div className="space-y-2.5 bg-[var(--app-surface-2)] p-3 rounded-xl border border-[var(--app-border)]">
                        <div className="text-[11px] font-extrabold text-[var(--app-muted)] uppercase flex items-center gap-1">
                          <Wrench size={13} /> Manoperă &amp; Deviz Piese Audatex
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Manoperă Tinichigerie</label>
                            <input
                              type="number"
                              min={0}
                              className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[var(--app-text-strong)] text-[12px] bg-white"
                              value={manoperaTinichigerie || 0}
                              onChange={(e) => setFinancial("manoperaTinichigerie", Number(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Manoperă Vopsitorie</label>
                            <input
                              type="number"
                              min={0}
                              className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[var(--app-text-strong)] text-[12px] bg-white"
                              value={manoperaVopsitorie || 0}
                              onChange={(e) => setFinancial("manoperaVopsitorie", Number(e.target.value) || 0)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Preț Achiziție Piese Audatex (lei)</label>
                          <input
                            type="number"
                            min={0}
                            className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[var(--app-text)] text-[12.5px] bg-white"
                            value={form.valoarePieseAudatex || 0}
                            onChange={(e) => set("valoarePieseAudatex", Number(e.target.value) || 0)}
                            placeholder="Preț piese din deviz"
                          />
                        </div>
                      </div>

                      {/* Coloana Dreapta: Piese Service & Cheltuieli Diverse */}
                      <div className="space-y-2.5 bg-[var(--app-surface-2)] p-3 rounded-xl border border-[var(--app-border)]">
                        <div className="text-[11px] font-extrabold text-[var(--app-warning)] uppercase flex items-center gap-1">
                          <Tag size={13} /> Costuri Realizate Service
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Preț Achiziție Piese Service (lei)</label>
                          <input
                            type="number"
                            min={0}
                            className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[var(--app-danger)] text-[12.5px] bg-white"
                            value={form.valoareAchizitiePiese || 0}
                            onChange={(e) => set("valoareAchizitiePiese", Number(e.target.value) || 0)}
                            placeholder="Cost real piese achiziționate"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Cheltuieli Diverse</label>
                            <input
                              type="number"
                              min={0}
                              className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[var(--app-text-strong)] text-[12px] bg-white"
                              value={cheltuieliDiverse || 0}
                              onChange={(e) => setFinancial("cheltuieliDiverse", Number(e.target.value) || 0)}
                              placeholder="Subcontractări / alte"
                            />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Cost Auto Schimb</label>
                            <input
                              type="number"
                              min={0}
                              className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[var(--app-text-strong)] text-[12px] bg-white"
                              value={costMasinaSchimb || 0}
                              onChange={(e) => setFinancial("costMasinaSchimb", Number(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary KPI Raport Financiar Real */}
                    <div className="p-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] shadow-xs mt-2">
                      <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] border-b border-[var(--app-border)] pb-1.5 mb-2 flex items-center justify-between">
                        <span>Raport Financiar &amp; Profitabilitate Reală Dosar</span>
                        <span className="text-[10.5px] text-[var(--app-muted)] font-normal uppercase">Calculat automat</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        {/* Venit Net */}
                        <div className="p-2.5 rounded-xl bg-white border border-[var(--app-border)]">
                          <div className="text-[10px] font-semibold text-[var(--app-muted)] uppercase mb-1">Venit Net</div>
                          <div className="text-[15px] font-extrabold text-[var(--app-text-strong)] font-mono">{venitNetTotal.toLocaleString("ro-RO")} <span className="text-[10px] font-normal">lei</span></div>
                          <div className="text-[9px] text-[var(--app-muted)] mt-0.5">{valoareAcceptPlata > 0 ? "Accept Plată" : "Deviz Audatex"}</div>
                        </div>

                        {/* Total Costuri */}
                        <div className="p-2.5 rounded-xl bg-white border border-[var(--app-danger)]/30">
                          <div className="text-[10px] font-semibold text-[var(--app-danger)] uppercase mb-1">Total Costuri</div>
                          <div className="text-[15px] font-extrabold text-[var(--app-danger)] font-mono">{totalCosturiService.toLocaleString("ro-RO")} <span className="text-[10px] font-normal">lei</span></div>
                          <div className="text-[9px] text-[var(--app-muted)] mt-0.5">Piese + Diverse + Schimb</div>
                        </div>

                        {/* Profit Brut */}
                        <div className={`p-2.5 rounded-xl bg-white border ${profitBrutReal >= 0 ? "border-[var(--app-success)]/30" : "border-[var(--app-danger)]/30"}`}>
                          <div className="text-[10px] font-semibold text-[var(--app-muted)] uppercase mb-1">Profit Brut</div>
                          <div className={`text-[15px] font-extrabold font-mono ${profitBrutReal >= 0 ? "text-[var(--app-success)]" : "text-[var(--app-danger)]"}`}>
                            {profitBrutReal >= 0 ? "+" : ""}{profitBrutReal.toLocaleString("ro-RO")} <span className="text-[10px] font-normal">lei</span>
                          </div>
                          <div className="text-[9px] text-[var(--app-muted)] mt-0.5">Venit - Costuri Service</div>
                        </div>

                        {/* Marjă Profit */}
                        <div className={`p-2.5 rounded-xl border ${parseFloat(marjaProfitProc) >= 20 ? "bg-emerald-50 border-[var(--app-success)]/40" : parseFloat(marjaProfitProc) >= 0 ? "bg-amber-50 border-amber-300" : "bg-red-50 border-[var(--app-danger)]/40"}`}>
                          <div className="text-[10px] font-semibold text-[var(--app-muted)] uppercase mb-1">Marjă Profit</div>
                          <div className={`text-[18px] font-extrabold font-mono ${parseFloat(marjaProfitProc) >= 20 ? "text-[var(--app-success)]" : parseFloat(marjaProfitProc) >= 0 ? "text-[var(--app-warning)]" : "text-[var(--app-danger)]"}`}>
                            {marjaProfitProc}%
                          </div>
                          <div className="text-[9px] text-[var(--app-muted)] mt-0.5">
                            {parseFloat(marjaProfitProc) >= 25 ? "Excelent" : parseFloat(marjaProfitProc) >= 15 ? "Acceptabil" : parseFloat(marjaProfitProc) >= 0 ? "Slab" : "Pierdere"}
                          </div>
                        </div>
                      </div>

                      {/* Detalii Marjă Piese */}
                      <div className="mt-2.5 p-2.5 bg-white border border-[var(--app-border)] rounded-xl">
                        <div className="text-[10.5px] font-bold text-[var(--app-muted)] uppercase mb-1.5 flex items-center gap-1"><Package size={12} /> Marjă Piese (Audatex vs. Achiziție Service)</div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[var(--app-muted)]">Preț Audatex: <strong className="text-[var(--app-text-strong)] font-mono">{pretPieseAudatex.toLocaleString("ro-RO")} lei</strong></span>
                          <span className="text-[var(--app-muted)]">Preț Service: <strong className="text-[var(--app-danger)] font-mono">{pretPieseService.toLocaleString("ro-RO")} lei</strong></span>
                          <span className={`font-extrabold font-mono text-[12px] ${marjaPiese >= 0 ? "text-[var(--app-success)]" : "text-[var(--app-danger)]"}`}>
                            {marjaPiese >= 0 ? "+" : ""}{marjaPiese.toLocaleString("ro-RO")} lei
                          </span>
                        </div>
                        <div className="mt-1.5 text-[10px] text-[var(--app-muted)]">
                          Total Manoperă: <strong className="text-[var(--app-text-strong)]">{totalManopera.toLocaleString("ro-RO")} lei</strong>
                          <span className="mx-2">·</span>
                          Franșiză client: <strong className="text-[#8C2E2E]">{valoareFransiza.toLocaleString("ro-RO")} lei</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 4: ISTORIC & NOTIȚE                                                   */}
              {/* ========================================================================= */}
              {activeTab === "history" && (
                <div className="space-y-3">
                  {/* Note Interne Echipă */}
                  <div className="bg-white border border-[var(--app-border)] rounded-xl p-3 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-1.5">
                      <h3 className="font-bold text-[12px] text-[var(--app-text-strong)] flex items-center gap-1.5">
                        <Sparkles size={14} className="text-[var(--app-accent)]" /> Notițe interne echipă ({form.note.length})
                      </h3>
                    </div>

                    <div className="flex gap-2">
                      <input
                        ref={noteInputRef}
                        className="flex-1 p-2 border border-[var(--app-border)] rounded-lg text-[12px] bg-[var(--app-surface-2)] focus:bg-white focus:border-[var(--app-accent)]"
                        placeholder="Adaugă o notă internă..."
                        value={noteText}
                        onChange={(e) => { setNoteText(e.target.value); setSlashIndex(0); }}
                        onKeyDown={handleNoteKeyDown}
                      />
                      <button
                        type="button"
                        onClick={() => addNote()}
                        className="px-3 py-1.5 bg-[var(--app-muted)] hover:bg-[var(--app-text)] text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 shrink-0"
                      >
                        <Plus size={15} /> Adaugă
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-0.5 max-h-56 overflow-y-auto pr-1">
                      {form.note.map((n) => {
                        const isAlert = n.text.includes("[ALERTĂ]");
                        const isParts = n.text.includes("[PIESE]");
                        const isCar = n.text.includes("[AUTO SCHIMB]");
                        const isCall = n.text.includes("[APEL CLIENT]");

                        return (
                          <div
                            key={n.id}
                            className={`p-2 rounded-lg border transition-all ${
                              isAlert ? "bg-red-50/70 border-red-200 text-[#8C2E2E]"
                              : isParts ? "bg-amber-50/70 border-amber-200 text-[var(--app-warning)]"
                              : isCar ? "bg-blue-50/70 border-blue-200 text-[var(--app-text)]"
                              : isCall ? "bg-emerald-50/70 border-emerald-200 text-[var(--app-success)]"
                              : "bg-[var(--app-surface-2)] border-[var(--app-border)] text-[var(--app-text-strong)]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[var(--app-muted)] border-b border-black/5 pb-1 mb-1">
                              <span className="truncate min-w-0">
                                {fmtDateTime(n.data)}
                                {n.author ? (
                                  <span className="ml-1.5 font-sans font-semibold text-[var(--app-text)]">
                                    · {n.author}
                                  </span>
                                ) : null}
                              </span>
                              <button type="button" onClick={() => removeNote(n.id)} className="text-[var(--app-danger)] hover:opacity-80 p-0.5 shrink-0">
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <div className="text-[12px] whitespace-pre-wrap font-medium leading-relaxed">
                              {n.text}
                            </div>
                          </div>
                        );
                      })}

                      {form.note.length === 0 && (
                        <div className="text-[12.5px] text-[var(--app-muted)] italic p-6 text-center border border-dashed border-[var(--app-border)] rounded-xl bg-[var(--app-surface-2)]">
                          Nicio notă înregistrată.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stepper Statusuri & Istoric Timeline */}
                  {!isNew && (
                    <div className="bg-white border border-[var(--app-border)] rounded-xl p-3 space-y-2 shadow-2xs">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--app-muted)] border-b border-[var(--app-border)]/60 pb-1 flex items-center gap-1.5">
                        <Layers size={13} className="text-[var(--app-muted)]" /> Etape Flux &amp; Jurnal de Activități
                      </div>
                      <div className="pt-1">
                        <ClaimTimeline
                          currentStatus={form.status}
                          dataSchimbareStatus={form.dataSchimbareStatus}
                          istoric={istoric}
                          loading={loadingIstoric}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Galerie fullscreen — swipe între poze */}
              {previewPozaIndex != null && form.poze?.length > 0 && (
                <PhotoLightbox
                  items={form.poze}
                  startIndex={previewPozaIndex}
                  onClose={() => setPreviewPozaIndex(null)}
                  zIndexClass="z-[10050]"
                />
              )}

              {/* CROP MODAL DOCUMENT (Punctul 1) */}
              {cropImageSrc && (
                <DocumentCropModal
                  imageSrc={cropImageSrc}
                  onClose={() => {
                    if (cropQueue.length > 0) {
                      setCropImageSrc(cropQueue[0]);
                      setCropQueue((q) => q.slice(1));
                    } else {
                      setCropImageSrc(null);
                      setCropMode("document");
                    }
                  }}
                  onConfirm={async (croppedDataUrl) => {
                    if (cropMode === "scan") {
                      setScanSession((prev) =>
                        prev
                          ? { ...prev, pages: [...prev.pages, croppedDataUrl] }
                          : {
                              fileName: `Scan_${form.numarInmatriculare || "Dosar"}_${todayISO()}`,
                              pages: [croppedDataUrl],
                              saveAsPdf: true,
                              saveAsPhotos: false,
                            }
                      );
                      if (cropQueue.length > 0) {
                        setCropImageSrc(cropQueue[0]);
                        setCropQueue((q) => q.slice(1));
                      } else {
                        setCropImageSrc(null);
                        setCropMode("document");
                      }
                      return;
                    }
                    setCropImageSrc(null);
                    const res = await fetch(croppedDataUrl);
                    const blob = await res.blob();
                    const cropFile = new File([blob], `Scan_Cropped_${todayISO()}.jpg`, { type: "image/jpeg" });
                    await handleUploadDocumente([cropFile]);
                  }}
                />
              )}

            </div>
          </fieldset>
        </div>

        {/* Footer — pill actions, not a full-bleed slab */}
        <div className="m-claim-footer shrink-0">
          {readOnly ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={() => onDelete(claim.id)}
              className="m-claim-footer-btn flex items-center gap-1 text-[var(--app-danger)] text-[12px] font-bold hover:bg-[var(--app-danger)]/10 px-3 py-1.5 transition-colors"
            >
              <Trash2 size={13} /> Șterge dosar
            </button>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={requestClose}
              className="m-claim-footer-btn px-4 py-1.5 border border-[var(--app-border)] text-[12.5px] font-bold text-[var(--app-text)] hover:bg-[var(--app-surface-2)] transition-colors"
            >
              {readOnly ? "Închide" : "Anulează"}
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={savingLocal}
                className="m-claim-footer-primary flex items-center gap-1.5 px-5 py-1.5 text-[12.5px] font-extrabold shadow-sm transition-colors disabled:opacity-60"
              >
                {savingLocal ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savingLocal ? "Se salvează…" : "Salvează modificările"}
              </button>
            )}
          </div>
        </div>

        {/* Unsaved changes — click outside / close while dirty */}
        {unsavedPrompt && (
          <div
            className="absolute inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
            onMouseDown={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="claim-unsaved-title"
          >
            <div
              className={`w-full max-w-sm rounded-xl border p-4 shadow-xl ${
                desktopUi
                  ? "bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-text)]"
                  : "bg-[var(--app-surface-muted)] border-white/15 text-white"
              }`}
            >
              <h3 id="claim-unsaved-title" className="text-[14px] font-bold tracking-tight">
                Modificări nesalvate
              </h3>
              <p className={`mt-1.5 text-[12.5px] leading-snug ${desktopUi ? "text-[var(--app-muted)]" : "text-white/70"}`}>
                Ai schimbări pe acest dosar. Salvează înainte de a închide, sau renunță la modificări.
              </p>
              <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUnsavedPrompt(false)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors ${
                    desktopUi
                      ? "border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
                      : "border-white/20 hover:bg-white/10"
                  }`}
                >
                  Continuă editarea
                </button>
                <button
                  type="button"
                  onClick={discardAndClose}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-bold border border-[var(--app-danger)]/40 text-[var(--app-danger)] hover:bg-[var(--app-danger)]/10 transition-colors"
                >
                  Renunță
                </button>
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="m-claim-footer-primary flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-extrabold transition-colors"
                >
                  <Save size={13} /> Salvează
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCANNER OVERLAY */}
        {scanSession && (
          <div className="absolute inset-0 bg-[var(--app-surface)]/95 z-50 flex flex-col p-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <h3 className="font-bold text-[13.5px] flex items-center gap-1.5 text-[var(--app-accent)]"><FileText size={16} /> Scanare document pagini multiple</h3>
              <button type="button" onClick={() => setScanSession(null)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {scanSession.pages.map((pageDataUrl, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-white/20 aspect-[3/4] bg-white/5">
                    <img src={pageDataUrl} alt={`Pagina ${idx + 1}`} className="w-full h-full object-contain" />
                    <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-bold">Pag. {idx + 1}</div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setScanSession(prev => ({
                          ...prev,
                          pages: prev.pages.filter((_, i) => i !== idx)
                        }));
                      }} 
                      className="absolute top-1 right-1 bg-[var(--app-danger)] text-white rounded p-1 hover:opacity-80"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-white/20 hover:border-white/40 cursor-pointer aspect-[3/4] bg-white/5 transition-all text-center p-2 hover:bg-white/10">
                  <Plus size={20} className="text-[var(--app-accent)]" />
                  <span className="text-[11px] font-semibold text-white/80">Adaugă pagină</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleAddPageToScan(e.target.files)} />
                </label>
              </div>
            </div>

            <div className="border-t border-white/10 pt-3 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex-1 w-full">
                  <label className="block text-[10.5px] text-white/60 font-semibold mb-1">Nume fișier (fără extensie)</label>
                  <div className="flex items-center gap-1 bg-white/5 border border-white/20 rounded-lg px-2.5 py-1.5">
                    <input 
                      className="bg-transparent border-0 text-[13px] text-white focus:outline-hidden w-full placeholder:text-white/30" 
                      placeholder="ex: Declaratie_accident" 
                      value={scanSession.fileName} 
                      onChange={(e) => setScanSession(prev => ({ ...prev, fileName: e.target.value }))} 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0 self-stretch sm:self-auto justify-center">
                  <label className="flex items-center gap-2 text-[11.5px] font-semibold select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={scanSession.saveAsPdf} 
                      onChange={(e) => setScanSession(prev => ({ ...prev, saveAsPdf: e.target.checked }))}
                      className="rounded border-white/20 bg-white/5 text-[var(--app-accent)] focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Salvează ca PDF unic</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11.5px] font-semibold select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={scanSession.saveAsPhotos} 
                      onChange={(e) => setScanSession(prev => ({ ...prev, saveAsPhotos: e.target.checked }))}
                      className="rounded border-white/20 bg-white/5 text-[var(--app-accent)] focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Salvează ca poze în Galerie</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setScanSession(null)} 
                  className="px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/5 text-[12.5px] font-semibold text-white/80 transition-colors"
                >
                  Anulează
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveMultiPageScan} 
                  disabled={scanSession.pages.length === 0}
                  className="flex items-center gap-1 px-5 py-1.5 rounded-lg bg-[var(--app-accent)] text-white text-[12.5px] font-bold hover:bg-[var(--app-accent-hover)] shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {(uploadingDocumente || uploadingPoze) ? <><Loader2 size={13} className="animate-spin" /> Se salvează...</> : <><Save size={13} /> Finalizează ({scanSession.pages.length} pag.)</>}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
