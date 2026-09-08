import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, ImageIcon, Wallet, History, ShieldCheck, AlertOctagon,
  Package, Car, Phone, ClipboardList, Wrench
} from "lucide-react";
import {
  STATUSES, INSURERS, getStatusDefinition, isPieseComandateStatus, getPhaseColors,
  MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES, MAX_POZE_PER_DOSAR, MAX_DOCUMENTE_PER_DOSAR
} from "../../constants/config";
import { todayISO, nowISO, uid } from "../../utils/dateUtils";
import {
  emptyClaim, sanitizeClaim, normalizedText, isValidPhone, storagePath,
  refreshStorageUrls, parseNumber, SIGNED_URL_TTL_SECONDS
} from "../../utils/claimUtils";
import { downloadClaimAsZip } from "../../utils/zipUtils";
import DocumentCropModal from "../common/DocumentCropModal";
import PhotoLightbox from "../common/PhotoLightbox";
import SchedulePromptModal from "../common/SchedulePromptModal";
import { supabase } from "../../supabaseClient";
import { fileToDataUrl } from "../../utils/documentScanner";
import { compressImage } from "../../utils/imageUtils";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
} from "../common/modalShellClasses";
import { loadCachedManoperaTarife } from "../../constants/manoperaTarife";
import { computeServiceLaborCosts, applyLaborCostsToClaim, hasConfiguredLaborRates } from "../../utils/manoperaCost";
import { buildServiceCostBreakdown } from "../../utils/serviceCostBreakdown";
import { shouldPromoteToProgramatOnSchedule, PRE_PROGRAMAT_STATUSES } from "../../utils/scheduleStatusEffects";
import { useModalEscape } from "../../hooks/useModalEscape";

import ClaimHeader from "./claim/ClaimHeader";
import ClaimGeneralTab from "./claim/ClaimGeneralTab";
import ClaimMediaTab from "./claim/ClaimMediaTab";
import ClaimFinancialTab from "./claim/ClaimFinancialTab";
import ClaimHistoryTab from "./claim/ClaimHistoryTab";
import ClaimFooter from "./claim/ClaimFooter";
import ClaimScannerOverlay from "./claim/ClaimScannerOverlay";
import ReceptieAutoModal from "./ReceptieAutoModal";
import SettlementPackageModal from "./SettlementPackageModal";
import LiveStreamCameraModal from "../common/LiveStreamCameraModal";
import { loadCachedBranding } from "../../constants/branding";
import ClaimScheduleFields from "../common/ClaimScheduleFields";
import MobilePieseSositeRow from "../mobile/MobilePieseSositeRow";

export function applyClaimStatusChange(prev, newStatusKey) {
  const mappedKey = getStatusDefinition(newStatusKey).key;
  const statusChanged = getStatusDefinition(prev?.status || "").key !== mappedKey;
  const now = nowISO();
  const today = todayISO();

  const updates = {
    status: mappedKey,
    dataSchimbareStatus: statusChanged ? now : prev.dataSchimbareStatus,
  };

  if (statusChanged) {
    updates.alerteAck = false;
  }

  // Automatism: Auto-completare Dată Eveniment dacă lipsește
  if (!prev.dataEveniment) {
    updates.dataEveniment = prev.dataDeschiderii ? String(prev.dataDeschiderii).slice(0, 10) : today;
  }

  // Automatism: Programare implicită pe azi la 09:00
  if (mappedKey === "programat" && !prev.dataProgramare) {
    updates.dataProgramare = `${today}T09:00:00`;
  }

  // Automatism: Reparație -> Marchează mașina ca adusă fizic
  if (mappedKey === "in_lucru") {
    updates.adusaFizic = true;
    updates.financiar = {
      ...(prev.financiar || {}),
      dataAdusaFizic: prev.financiar?.dataAdusaFizic || now,
    };
  }

  // Automatism: Reparație Finalizată -> Marchează gata de ridicare cu timestamp
  if (mappedKey === "reparatie_finalizata" || mappedKey === "gata_de_ridicare") {
    updates.gataDeRidicare = true;
    updates.dataGataRidicare = prev.dataGataRidicare || now;
  }

  // Automatism: Predat -> Marchează ridicată de client cu timestamp
  if (mappedKey === "predat" || mappedKey === "predat_client") {
    updates.ridicata = true;
    updates.dataRidicare = prev.dataRidicare || now;
  }

  // Automatism: Comandă piese -> Setează data comenzii de piese dacă e goală
  if (mappedKey === "piese_comandate" && !prev.dataComandaPiese) {
    updates.dataComandaPiese = today;
  }

  if (PRE_PROGRAMAT_STATUSES.includes(mappedKey) || PRE_PROGRAMAT_STATUSES.includes(newStatusKey)) {
    updates.dataProgramare = null;
  }

  return { ...prev, ...updates };
}

export const SLASH_COMMANDS = [
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
  manoperaTarife: manoperaTarifeProp = null,
}) {
  const safeClaim = useMemo(() => sanitizeClaim(claim), [claim]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [savingLocal, setSavingLocal] = useState(false);
  const [isReceptieModalOpen, setIsReceptieModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest("select")) return;
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      setDragOffset({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
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
  const [schedulePromptOpen, setSchedulePromptOpen] = useState(false);

  const handleSelectStatus = (newStatusKey) => {
    const mapped = getStatusDefinition(newStatusKey).key;
    if (mapped === "programat" && form.status !== "programat") {
      setSchedulePromptOpen(true);
      return;
    }
    setForm((f) => applyClaimStatusChange(f, newStatusKey));
  };
  const [activeTab, setActiveTab] = useState("general"); // "general" | "media" | "financial" | "history"
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [cameraCategory, setCameraCategory] = useState("generale");
  const [noteText, setNoteText] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const noteInputRef = useRef(null);
  const [scanSession, setScanSession] = useState(null); // { pages: [dataUrl] }
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

  const manoperaTarife = useMemo(
    () => manoperaTarifeProp || loadCachedManoperaTarife(),
    [manoperaTarifeProp]
  );

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
    let cancelled = false;
    supabase.from("istoric_dosar").select("*").eq("dosar_id", claim.id).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => { if (!cancelled) setIstoric(data || []); })
      .finally(() => setLoadingIstoric(false));
    return () => { cancelled = true; };
  }, [claim?.id, isNew]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setFinancial = (key, value) => setForm((f) => ({ ...f, financiar: { ...(f.financiar || {}), [key]: value } }));

  const setAudatexDevizField = (key, rawVal) => {
    const n = Number(rawVal) || 0;
    setForm((f) => {
      const financiar = { ...(f.financiar || {}) };
      const audatex = { ...(financiar.audatex || {}), [key]: n };
      const tvaProc = parseNumber(financiar.tvaProc, 21);
      const patch = { financiar: { ...financiar, audatex } };

      if (key === "totalPiese") {
        patch.valoarePieseAudatex = n;
        patch.financiar.pieseFacturateFaraTva = n;
      }
      if (key === "totalManopera") {
        patch.financiar.manoperaTinichigerie = n;
        patch.manopera = {
          ...(f.manopera || {}),
          tinichigerie: {
            ...(f.manopera?.tinichigerie || { facturat: 0, alocat: 0, dataIntrareEtapa: null }),
            facturat: n,
          },
        };
      }
      if (key === "manoperaVopsitorie") {
        patch.financiar.manoperaVopsitorie = n;
        patch.manopera = {
          ...(f.manopera || {}),
          vopsitorie: {
            ...(f.manopera?.vopsitorie || { facturat: 0, alocat: 0, dataIntrareEtapa: null }),
            facturat: n,
          },
        };
      }
      if (key === "materialeVopsitorie") {
        patch.financiar.materialeVopsitorie = n;
      }
      if (key === "costReparatieFaraTva") {
        patch.valoareDevizAudatex = n;
        patch.financiar.valoareDevizAudatex = n;
        if (!audatex.costReparatieCuTva || audatex.costReparatieCuTva === 0) {
          audatex.costReparatieCuTva = Math.round(n * (1 + tvaProc / 100) * 100) / 100;
          patch.financiar.audatex = audatex;
        }
      }

      return { ...f, ...patch };
    });
  };

  const setCheltuieliService = (val) =>
    setForm((f) => ({
      ...f,
      financiar: {
        ...(f.financiar || {}),
        cheltuieliDiverse: val,
        costuriExterne: val,
      },
    }));

  const applyLaborFromOre = useCallback(
    (oreTin, oreVops) => {
      setForm((f) =>
        applyLaborCostsToClaim(f, manoperaTarife, {
          oreTinichigerie: oreTin ?? f.financiar?.oreLucrateTinichigerie ?? 0,
          oreVopsitorie: oreVops ?? f.financiar?.oreLucrateVopsitorie ?? 0,
        })
      );
    },
    [manoperaTarife]
  );

  const financial = form.financiar || {};
  const audatexDeviz = financial.audatex || {};
  const readDevizFaraTva = () =>
    parseNumber(audatexDeviz.costReparatieFaraTva ?? form.valoareDevizAudatex ?? financial.valoareDevizAudatex, 0);

  const getAudatexDevizValue = (key) => {
    const v = audatexDeviz[key];
    if (v != null && v !== "") return parseNumber(v, 0);
    if (key === "totalPiese") return parseNumber(form.valoarePieseAudatex ?? financial.pieseFacturateFaraTva, 0);
    if (key === "totalManopera") return parseNumber(financial.manoperaTinichigerie ?? form.manopera?.tinichigerie?.facturat, 0);
    if (key === "manoperaVopsitorie") return parseNumber(financial.manoperaVopsitorie ?? form.manopera?.vopsitorie?.facturat, 0);
    if (key === "materialeVopsitorie") return parseNumber(financial.materialeVopsitorie, 0);
    if (key === "totalCosturiSuplimentare") return parseNumber(audatexDeviz.totalCosturiSuplimentare, 0);
    if (key === "totalVopsitorie") {
      return parseNumber(
        audatexDeviz.totalVopsitorie ??
          (parseNumber(financial.manoperaVopsitorie, 0) + parseNumber(financial.materialeVopsitorie, 0)),
        0
      );
    }
    if (key === "costReparatieFaraTva") return readDevizFaraTva();
    if (key === "costReparatieCuTva") {
      const fara = readDevizFaraTva();
      const tvaProc = parseNumber(financial.tvaProc, 21);
      return Math.round(fara * (1 + tvaProc / 100) * 100) / 100;
    }
    return 0;
  };

  const valoareDevizAudatex = getAudatexDevizValue("costReparatieFaraTva");
  const valoareAcceptPlata = parseNumber(financial.valoareAcceptPlata ?? form.valoareAcceptataReglata, 0);
  const valoareFransiza = parseNumber(financial.valoareFransiza, 0);

  const totalPieseAudatex = getAudatexDevizValue("totalPiese");
  const totalManoperaAudatex = getAudatexDevizValue("totalManopera");
  const totalCosturiSuplimentareAudatex = getAudatexDevizValue("totalCosturiSuplimentare");
  const totalVopsitorieAudatex = getAudatexDevizValue("totalVopsitorie");
  const manoperaVopsitorieAudatex = parseNumber(audatexDeviz.manoperaVopsitorie, 0);
  const materialeVopsitorie = parseNumber(audatexDeviz.materialeVopsitorie ?? financial.materialeVopsitorie, 0);

  const venitManoperaAudatex = totalManoperaAudatex + manoperaVopsitorieAudatex;
  const costManoperaTinichigerieService = parseNumber(financial.costManoperaTinichigerieService, 0);
  const costManoperaVopsitorieService = parseNumber(financial.costManoperaVopsitorieService, 0);
  const oreLucrateTinichigerie = parseNumber(financial.oreLucrateTinichigerie, 0);
  const oreLucrateVopsitorie = parseNumber(financial.oreLucrateVopsitorie, 0);
  const laborPreview = computeServiceLaborCosts(oreLucrateTinichigerie, oreLucrateVopsitorie, manoperaTarife);
  const laborRatesConfigured = hasConfiguredLaborRates(manoperaTarife);
  const costManoperaService = costManoperaTinichigerieService + costManoperaVopsitorieService;
  const marjaManopera = venitManoperaAudatex - costManoperaService;

  const pretPieseAudatex = totalPieseAudatex;
  const pretPieseService = parseNumber(form.valoareAchizitiePiese, 0);
  const marjaPiese = pretPieseAudatex - pretPieseService;

  const cheltuieliDiverseService = parseNumber(financial.cheltuieliDiverse ?? financial.costuriExterne, 0);
  const costMaterialeVopsitorieService = parseNumber(financial.costMaterialeVopsitorieService, 0);
  const costConsumabileTinichigerieService = parseNumber(financial.costConsumabileTinichigerieService, 0);
  const costMasinaSchimb = parseNumber(financial.costMasinaSchimb, 0);
  
  // Calcul inteligent pentru componente deviz (evită dubla numărare dacă manopera totală include deja vopsitoria)
  const totalDevizComponente = useMemo(() => {
    const rawSum = totalPieseAudatex + totalManoperaAudatex + totalCosturiSuplimentareAudatex + totalVopsitorieAudatex;
    if (valoareDevizAudatex > 0) {
      if (Math.abs(rawSum - valoareDevizAudatex) <= 1) return valoareDevizAudatex;
      const withoutVops = totalPieseAudatex + totalManoperaAudatex + totalCosturiSuplimentareAudatex;
      if (Math.abs(withoutVops - valoareDevizAudatex) <= 1) return valoareDevizAudatex;
      if (totalManoperaAudatex >= totalVopsitorieAudatex && totalVopsitorieAudatex > 0) {
        const adjusted = totalPieseAudatex + (totalManoperaAudatex - totalVopsitorieAudatex) + totalVopsitorieAudatex + totalCosturiSuplimentareAudatex;
        if (Math.abs(adjusted - valoareDevizAudatex) <= 1) return valoareDevizAudatex;
      }
    }
    return rawSum;
  }, [totalPieseAudatex, totalManoperaAudatex, totalCosturiSuplimentareAudatex, totalVopsitorieAudatex, valoareDevizAudatex]);

  const venitNetTotal = valoareAcceptPlata > 0 ? valoareAcceptPlata : valoareDevizAudatex;
  const totalCosturiService =
    pretPieseService +
    costManoperaService +
    costMaterialeVopsitorieService +
    costConsumabileTinichigerieService +
    cheltuieliDiverseService +
    costMasinaSchimb;
  const profitBrutReal = venitNetTotal - totalCosturiService;
  const marjaProfitProc = venitNetTotal > 0 ? ((profitBrutReal / venitNetTotal) * 100).toFixed(1) : "0.0";

  const serviceCostBreakdown = useMemo(
    () =>
      buildServiceCostBreakdown({
        piese: pretPieseService,
        manoperaTinichigerie: costManoperaTinichigerieService,
        manoperaVopsitorie: costManoperaVopsitorieService,
        materialeVopsitorie: costMaterialeVopsitorieService,
        consumabileTinichigerie: costConsumabileTinichigerieService,
        diverse: cheltuieliDiverseService,
        masinaSchimb: costMasinaSchimb,
      }),
    [
      pretPieseService,
      costManoperaTinichigerieService,
      costManoperaVopsitorieService,
      costMaterialeVopsitorieService,
      costConsumabileTinichigerieService,
      cheltuieliDiverseService,
      costMasinaSchimb,
    ]
  );

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
    onNotify?.("Date duplicate — completează numărul de dosar nou și verifică restul.", "success");
    onJumpTo?.(dup);
  };

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

  const ignoreClaimEscape = useCallback(
    () => previewPozaIndex != null || Boolean(cropImageSrc) || Boolean(scanSession),
    [previewPozaIndex, cropImageSrc, scanSession]
  );
  const onClaimEscape = useCallback(() => {
    if (unsavedPrompt) {
      setUnsavedPrompt(false);
      return;
    }
    if (!isDirty) {
      setUnsavedPrompt(false);
      onClose?.();
      return;
    }
    setUnsavedPrompt(true);
  }, [unsavedPrompt, isDirty, onClose]);
  useModalEscape(onClaimEscape, { ignore: ignoreClaimEscape });

  const discardAndClose = () => {
    setUnsavedPrompt(false);
    onClose?.();
  };

  const handleSave = (openProgramator = false) => {
    const numarDosar = (form.numarDosar || "").trim();
    const numarInmatriculare = (form.numarInmatriculare || "").trim().toUpperCase();
    const vin = (form.vin || "").trim().toUpperCase();
    const telefonClient = (form.telefonClient || "").trim();

    if (!numarDosar) { onNotify?.("Introduceți numărul dosarului.", "error"); return false; }
    if (!numarInmatriculare) { onNotify?.("Introduceți numărul de înmatriculare.", "error"); return false; }
    if (telefonClient && !isValidPhone(telefonClient)) {
      onNotify?.("Telefonul trebuie să conțină între 7 și 15 cifre.", "error");
      return false;
    }

    const duplicateDosar = Array.isArray(allClaims) ? allClaims.find((c) =>
      c && c.id && c.id !== claim?.id && normalizedText(c.numarDosar) === normalizedText(numarDosar)
    ) : null;
    if (duplicateDosar) {
      onNotify?.(`Numărul de dosar „${numarDosar}” este deja folosit de un alt dosar.`, "error");
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
      onNotify?.("Selectează data și ora programării pentru statusul „Programat”.", "error");
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

    const statusChanged = effectiveStatus !== claim?.status;
    if (statusChanged && effectiveStatus === "facturat") {
      const faraValori = !form.manopera?.tinichigerie?.facturat && !form.manopera?.vopsitorie?.facturat &&
        !form.valoarePieseAudatex && !form.valoareAchizitiePiese;
      if (faraValori) {
        const ok = confirm("Nu ai completat nicio valoare de manoperă sau piese pentru acest dosar. Sigur vrei să-l marchezi ca facturat?");
        if (!ok) return false;
      }
    }

    setUnsavedPrompt(false);
    setSavingLocal(true);
    Promise.resolve(
      onSave?.({
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

  const removeNote = (id) => setForm((f) => ({ ...f, note: (f.note || []).filter((n) => n.id !== id) }));

  const removeDoc = async (id) => {
    const doc = (form.documente || []).find((d) => d.id === id);
    if (!doc) return;
    if (doc?.path) {
      const { error } = await supabase.storage.from("documente-dosare").remove([doc.path]);
      if (error) {
        onNotify?.(`Nu am putut șterge documentul „${doc.nume || ""}”: ${error.message}`, "error");
        return;
      }
    }
    const nextDocs = form.documente.filter((d) => d.id !== id);
    setFormMedia({ documente: nextDocs });
    await persistMediaPatch({ removeDocumente: [doc] });
  };

  const removePoza = async (pozaOrId) => {
    const poza = typeof pozaOrId === "object" ? pozaOrId : (form.poze || []).find((p) => p.id === pozaOrId);
    if (!poza) return;
    if (poza?.path) {
      const { error } = await supabase.storage.from("poze-dosare").remove([poza.path]);
      if (error) {
        onNotify?.(`Nu am putut șterge fotografia „${poza.nume || ""}”: ${error.message}`, "error");
        return;
      }
    }
    const nextPoze = (form.poze || []).filter((p) => p.id !== poza.id);
    setFormMedia({ poze: nextPoze });
    await persistMediaPatch({ removePoze: [poza] });
  };

  const handleUploadPoze = async (fileList, categoria = "generale") => {
    const requested = Array.from(fileList || []);
    if (requested.length === 0) return;

    const currentPoze = Array.isArray(form.poze) ? form.poze : [];
    const locMax = MAX_POZE_PER_DOSAR - currentPoze.length;
    if (locMax <= 0) {
      onNotify?.(`Ai atins limita de ${MAX_POZE_PER_DOSAR} poze pentru acest dosar.`, "error");
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
      onNotify?.(`${respinse.length} fișier(e) peste ${MAX_UPLOAD_SIZE_MB}MB au fost ignorate: ${respinse.join(", ")}`, "error");
    }
    if (requested.length > locMax && files.length === locMax) {
      onNotify?.(`Doar ${locMax} poze au fost încărcate — limita e ${MAX_POZE_PER_DOSAR}/dosar.`, "error");
    }
    if (files.length === 0) {
      setUploadingPoze(false);
      return;
    }

    const noi = [];
    const claimId = form.id || claim?.id || uid();
    for (const file of files) {
      const fileToUpload = file?.type?.startsWith("image/")
        ? await compressImage(file)
        : file;
      const path = storagePath(claimId, fileToUpload);
      const { error } = await supabase.storage.from("poze-dosare").upload(path, fileToUpload, {
        contentType: fileToUpload.type || "image/jpeg",
        upsert: false,
      });
      if (error) { onNotify?.(`Eroare la încărcarea „${file.name}”: ${error.message}`, "error"); continue; }
      const { data: signed, error: signedError } = await supabase.storage.from("poze-dosare").createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (signedError) {
        await supabase.storage.from("poze-dosare").remove([path]);
        onNotify?.(`Eroare la generarea linkului pentru „${file.name}”: ${signedError.message}`, "error");
        continue;
      }
      const nume = fileToUpload.name || file.name || `Foto_${uid().slice(0, 4)}.jpg`;
      noi.push({ id: uid(), path, url: signed?.signedUrl || "", nume, categoria, incarcatLa: nowISO() });
    }
    if (noi.length) {
      setFormMedia({ poze: [...noi, ...currentPoze] });
      onNotify?.(`${noi.length} fotografie(i) încărcată(e) în categoria „${categoria}”.`, "success");
      await persistMediaPatch({ appendPoze: noi });
    }
    setUploadingPoze(false);
  };

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      await downloadClaimAsZip(form, form.numarDosar);
      onNotify?.("Arhiva ZIP a fost descărcată cu succes!", "success");
    } catch (err) {
      onNotify?.(`Eroare la generarea arhivei ZIP: ${err.message}`, "error");
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleUploadDocumente = async (fileList) => {
    const requested = Array.from(fileList || []);
    if (requested.length === 0) return;

    const currentDocs = Array.isArray(form.documente) ? form.documente : [];
    const locMax = MAX_DOCUMENTE_PER_DOSAR - currentDocs.length;
    if (locMax <= 0) {
      onNotify?.(`Ai atins limita de ${MAX_DOCUMENTE_PER_DOSAR} documente pentru acest dosar.`, "error");
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
      onNotify?.(`${respinse.length} fișier(e) peste ${MAX_UPLOAD_SIZE_MB}MB au fost ignorate: ${respinse.join(", ")}`, "error");
    }
    if (requested.length > locMax && files.length === locMax) {
      onNotify?.(`Doar ${locMax} documente au fost încărcate — limita e ${MAX_DOCUMENTE_PER_DOSAR}/dosar.`, "error");
    }
    if (files.length === 0) return;

    setUploadingDocumente(true);
    const noi = [];
    const claimId = form.id || claim?.id || uid();
    for (const file of files) {
      const fileToUpload = file?.type?.startsWith("image/")
        ? await compressImage(file)
        : file;
      const path = storagePath(claimId, fileToUpload);
      const { error } = await supabase.storage.from("documente-dosare").upload(path, fileToUpload, { upsert: false });
      if (error) { onNotify?.(`Eroare la încărcarea „${file.name}”: ${error.message}`, "error"); continue; }
      const { data: signed, error: signedError } = await supabase.storage.from("documente-dosare").createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (signedError) {
        await supabase.storage.from("documente-dosare").remove([path]);
        onNotify?.(`Eroare la generarea linkului pentru „${file.name}”: ${signedError.message}`, "error");
        continue;
      }
      const nume = fileToUpload.name || file.name;
      noi.push({ id: uid(), path, url: signed?.signedUrl || "", nume, incarcatLa: nowISO() });
    }
    if (noi.length) {
      setFormMedia({ documente: [...noi, ...currentDocs] });
      onNotify?.(`${noi.length} document(e) încărcat(e).`, "success");
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
      onNotify?.(err.message, "error");
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
      onNotify?.(err.message, "error");
    }
  };

  const handleSaveMultiPageScan = async () => {
    if (!scanSession || scanSession.pages.length === 0) return;
    if (!scanSession.saveAsPdf && !scanSession.saveAsPhotos) {
      onNotify?.("Te rog selectează cel puțin o opțiune de salvare (PDF sau Poze).", "error");
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
      onNotify?.(err.message, "error");
    } finally {
      setUploadingDocumente(false);
      setUploadingPoze(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={modalOverlayClass(desktopUi, { dense: true, layer: "front" })}
      {...modalOverlayProps(desktopUi, themeId)}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
        className={modalPanelClass(
          desktopUi,
          "app-fixed-shell-modal relative w-full h-full sm:h-[94vh] sm:max-h-[94vh] sm:max-w-5xl rounded-none sm:rounded-lg flex flex-col overflow-hidden bg-[var(--app-surface)] sm:border sm:border-[var(--app-border)]"
        )}
      >
        {/* Header Bar */}
        <ClaimHeader
          form={form}
          set={set}
          isNew={isNew}
          istoric={istoric}
          desktopUi={desktopUi}
          pdfMenuOpen={pdfMenuOpen}
          setPdfMenuOpen={setPdfMenuOpen}
          pdfMenuRef={pdfMenuRef}
          downloadingZip={downloadingZip}
          handleDownloadZip={handleDownloadZip}
          handleDuplicate={handleDuplicate}
          onOpenReceptie={() => setIsReceptieModalOpen(true)}
          onOpenSettlement={() => setIsSettlementModalOpen(true)}
          requestClose={requestClose}
          handleMouseDown={handleMouseDown}
        />

        {readOnly && (
          <div className="px-4 py-1.5 bg-[var(--app-border-soft)] text-[var(--app-muted)] text-[11px] flex items-center gap-1.5 shrink-0 border-b border-[var(--app-border)] font-medium">
            <ShieldCheck size={13} className="text-[var(--app-accent)]" /> Vizualizare restricționată - poți citi, nu edita.
          </div>
        )}

        {/* BARA INTERACTIVĂ DE STADII FLUX (Sticky la scroll) */}
        <div className="bg-[var(--app-surface)] border-b border-[var(--app-border)] px-4 py-2.5 shadow-sm space-y-2 sticky top-[52px] z-20 flex-shrink-0">
          {/* 9 Segmented Progress Bar */}
          <div className="flex items-center gap-1 h-2 w-full bg-[var(--app-border-soft)] rounded-full overflow-hidden p-0.5">
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
                    handleSelectStatus(s.key);
                  }}
                  title={`${s.num}. ${s.label}`}
                  className="h-full flex-1 rounded-xs transition-all cursor-pointer hover:opacity-90"
                  style={{
                    backgroundColor: isDone || isCurrent ? phaseColor : "var(--app-border)",
                    opacity: isCurrent ? 1 : isDone ? 0.75 : 0.3,
                  }}
                />
              );
            })}
          </div>

          {/* Status Label */}
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className="text-[10px] text-[var(--app-muted)] font-semibold">
              Etapa {Math.max(1, STATUSES.findIndex((s) => s.key === getStatusDefinition(form.status).key) + 1)} din {STATUSES.length} — click pe segment pentru a schimba
            </span>

            <select
              value={form.status}
              onChange={(e) => {
                handleSelectStatus(e.target.value);
              }}
              className="font-bold text-[11px] py-1 px-2 border border-[var(--app-border)] rounded-md bg-[var(--app-surface-2)] text-[var(--app-text-strong)] focus:border-[var(--app-muted)] cursor-pointer"
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
              layout="inline"
              onToggle={(val) => set("pieseSosite", val)}
              onSchedule={(iso) => {
                setForm((f) => {
                  const draft = applyClaimStatusChange(f, "programat");
                  draft.dataProgramare = iso;
                  return draft;
                });
              }}
              onPatchDates={(updates) => {
                setForm((f) => ({ ...f, ...updates }));
              }}
            />
          )}
        </div>

        {/* TAB BAR NAVIGATION */}
        <div className="flex border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 pt-2 gap-1 shrink-0 overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
              activeTab === "general"
                ? "border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-surface-2)]"
                : "border-transparent text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)]/50"
            }`}
          >
            <FileText size={14} /> Date Generale
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("media")}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
              activeTab === "media"
                ? "border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-surface-2)]"
                : "border-transparent text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)]/50"
            }`}
          >
            <ImageIcon size={14} /> Poze &amp; Documente
            {(form.poze?.length > 0 || form.documente?.length > 0) && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--app-surface-3)] text-[var(--app-muted)]">
                {(form.poze?.length || 0) + (form.documente?.length || 0)}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("financial")}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
              activeTab === "financial"
                ? "border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-surface-2)]"
                : "border-transparent text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)]/50"
            }`}
          >
            <Wallet size={14} /> Deviz &amp; Finanțe
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
              activeTab === "history"
                ? "border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-surface-2)]"
                : "border-transparent text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)]/50"
            }`}
          >
            <History size={14} /> Istoric &amp; Note
            {form.note?.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--app-surface-3)] text-[var(--app-muted)]">
                {form.note.length}
              </span>
            )}
          </button>
        </div>

        {/* MAIN BODY */}
        <div className="app-claim-modal-body app-fixed-shell-body flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[var(--app-surface-2)]">
          <fieldset disabled={readOnly} className="border-0 m-0 p-0 min-w-0 min-h-full">
            <div className="p-3 pb-5 space-y-3 font-sans">
              {activeTab === "general" && (
                <ClaimGeneralTab
                  form={form}
                  setForm={setForm}
                  set={set}
                  setFinancial={setFinancial}
                  insurersList={insurersList}
                  readOnly={readOnly}
                  isNew={isNew}
                  toggleGata={toggleGata}
                  toggleRidicata={toggleRidicata}
                  applyClaimStatusChange={applyClaimStatusChange}
                  applyLaborFromOre={applyLaborFromOre}
                  laborRatesConfigured={laborRatesConfigured}
                  laborPreview={laborPreview}
                  onNotify={onNotify}
                />
              )}

              {activeTab === "media" && (
                <ClaimMediaTab
                  form={form}
                  uploadingPoze={uploadingPoze}
                  uploadingDocumente={uploadingDocumente}
                  downloadingZip={downloadingZip}
                  handleUploadPoze={handleUploadPoze}
                  handleUploadDocumente={handleUploadDocumente}
                  handleDownloadZip={handleDownloadZip}
                  removePoza={removePoza}
                  removeDoc={removeDoc}
                  setPreviewPozaIndex={setPreviewPozaIndex}
                  setCropMode={setCropMode}
                  setCropImageSrc={setCropImageSrc}
                  onOpenLiveCamera={(cat) => {
                    setCameraCategory(cat);
                    setShowLiveCamera(true);
                  }}
                  onStartScan={handleStartScanSession}
                />
              )}

              {activeTab === "financial" && (
                <ClaimFinancialTab
                  form={form}
                  setForm={setForm}
                  set={set}
                  setFinancial={setFinancial}
                  readOnly={readOnly}
                  manoperaTarife={manoperaTarife}
                  setAudatexDevizField={setAudatexDevizField}
                  setCheltuieliService={setCheltuieliService}
                  applyLaborFromOre={applyLaborFromOre}
                  getAudatexDevizValue={getAudatexDevizValue}
                  valoareDevizAudatex={valoareDevizAudatex}
                  valoareAcceptPlata={valoareAcceptPlata}
                  valoareFransiza={valoareFransiza}
                  totalDevizComponente={totalDevizComponente}
                  totalPieseAudatex={totalPieseAudatex}
                  totalManoperaAudatex={totalManoperaAudatex}
                  totalCosturiSuplimentareAudatex={totalCosturiSuplimentareAudatex}
                  totalVopsitorieAudatex={totalVopsitorieAudatex}
                  manoperaVopsitorieAudatex={manoperaVopsitorieAudatex}
                  materialeVopsitorie={materialeVopsitorie}
                  venitManoperaAudatex={venitManoperaAudatex}
                  costManoperaTinichigerieService={costManoperaTinichigerieService}
                  costManoperaVopsitorieService={costManoperaVopsitorieService}
                  oreLucrateTinichigerie={oreLucrateTinichigerie}
                  oreLucrateVopsitorie={oreLucrateVopsitorie}
                  laborPreview={laborPreview}
                  laborRatesConfigured={laborRatesConfigured}
                  costManoperaService={costManoperaService}
                  marjaManopera={marjaManopera}
                  pretPieseAudatex={pretPieseAudatex}
                  pretPieseService={pretPieseService}
                  marjaPiese={marjaPiese}
                  cheltuieliDiverseService={cheltuieliDiverseService}
                  costMaterialeVopsitorieService={costMaterialeVopsitorieService}
                  costConsumabileTinichigerieService={costConsumabileTinichigerieService}
                  costMasinaSchimb={costMasinaSchimb}
                  venitNetTotal={venitNetTotal}
                  totalCosturiService={totalCosturiService}
                  profitBrutReal={profitBrutReal}
                  marjaProfitProc={marjaProfitProc}
                  serviceCostBreakdown={serviceCostBreakdown}
                  onNotify={onNotify}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === "history" && (
                <ClaimHistoryTab
                  form={form}
                  isNew={isNew}
                  istoric={istoric}
                  loadingIstoric={loadingIstoric}
                  noteText={noteText}
                  setNoteText={setNoteText}
                  slashIndex={slashIndex}
                  setSlashIndex={setSlashIndex}
                  noteInputRef={noteInputRef}
                  filteredSlashCommands={filteredSlashCommands}
                  applySlashCommand={applySlashCommand}
                  addNote={addNote}
                  handleNoteKeyDown={handleNoteKeyDown}
                  removeNote={removeNote}
                  readOnly={readOnly}
                />
              )}



              {/* Crop Modal */}
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

        {/* Footer */}
        <ClaimFooter
          readOnly={readOnly}
          claimId={claim?.id}
          onDelete={onDelete}
          requestClose={requestClose}
          handleSave={handleSave}
          savingLocal={savingLocal}
          unsavedPrompt={unsavedPrompt}
          setUnsavedPrompt={setUnsavedPrompt}
          discardAndClose={discardAndClose}
          desktopUi={desktopUi}
        />

        {/* Multi-Page Scan Session Overlay */}
        <ClaimScannerOverlay
          scanSession={scanSession}
          setScanSession={setScanSession}
          uploadingDocumente={uploadingDocumente}
          uploadingPoze={uploadingPoze}
          handleAddPageToScan={handleAddPageToScan}
          handleSaveMultiPageScan={handleSaveMultiPageScan}
          onOpenLiveCamera={(cat) => {
            setCameraCategory(cat);
            setShowLiveCamera(true);
          }}
        />

        {showLiveCamera && (
          <LiveStreamCameraModal
            initialCategorie={cameraCategory}
            onSavePhoto={(files, cat) => {
              if (cat === "scan_crop") {
                const file = files?.[0];
                if (file) {
                  setCropMode("document");
                  const reader = new FileReader();
                  reader.onload = (ev) => setCropImageSrc(ev.target.result);
                  reader.readAsDataURL(file);
                }
              } else if (cat === "scan_multi") {
                handleAddPageToScan?.(files);
              } else {
                handleUploadPoze(files, cat);
              }
            }}
            onClose={() => setShowLiveCamera(false)}
          />
        )}

        {/* Modal Recepție Auto & Semnătură Digitală */}
        {isReceptieModalOpen && (
          <ReceptieAutoModal
            isOpen={isReceptieModalOpen}
            onClose={() => setIsReceptieModalOpen(false)}
            claim={form}
            onPatchClaim={async (id, patch) => {
              setForm((prev) => ({ ...prev, ...patch }));
              if (onPatch) await onPatch(id, patch);
            }}
            onNotify={onNotify}
            atelierBranding={loadCachedBranding()}
          />
        )}

        {/* Modal Pachet Decont Asigurător 1-Click ZIP */}
        {isSettlementModalOpen && (
          <SettlementPackageModal
            isOpen={isSettlementModalOpen}
            onClose={() => setIsSettlementModalOpen(false)}
            claim={form}
            onNotify={onNotify}
            atelierBranding={loadCachedBranding()}
          />
        )}

        <SchedulePromptModal
          open={schedulePromptOpen}
          claim={form}
          initialDate={form.dataProgramare}
          desktopUi={desktopUi}
          onConfirm={(iso) => {
            setForm((f) => {
              const draft = applyClaimStatusChange(f, "programat");
              draft.dataProgramare = iso;
              return draft;
            });
            setSchedulePromptOpen(false);
          }}
          onClose={() => setSchedulePromptOpen(false)}
        />

        {/* Galerie foto fullscreen — deschisă peste întregul card al dosarului (z-20000) */}
        {previewPozaIndex != null && form.poze?.length > 0 && (
          <PhotoLightbox
            items={form.poze}
            startIndex={previewPozaIndex}
            onClose={() => setPreviewPozaIndex(null)}
            onDelete={!readOnly ? (p) => removePoza(p) : undefined}
            zIndexClass="z-[20000]"
          />
        )}
      </motion.div>
    </motion.div>
  );
}
