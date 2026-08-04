import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText, FileDown, Copy, X, ShieldCheck, History, Loader2, Car, Phone, MessageCircle,
  Clock, AlertOctagon, Wrench, Paintbrush, ImageIcon, Upload, Trash2, Save, MessageSquare, Plus,
  FolderOpen, PackageCheck, CheckCircle2, CalendarClock, Wallet, Tag, Layers, AlertCircle, Sparkles, User as UserIcon,
  CheckSquare, Square, Download, Calendar, Eye
} from "lucide-react";
import {
  STATUSES, INSURERS, INSURANCE_TYPES, getStatusDefinition,
  MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES, MAX_POZE_PER_DOSAR, MAX_DOCUMENTE_PER_DOSAR
} from "../../constants/config";
import { fmtDate, fmtDateTime, todayISO, daysBetween, nowISO, telLink, waLink, uid, fmtProgramare } from "../../utils/dateUtils";
import {
  emptyClaim, sanitizeClaim, normalizedText, isValidPhone, storagePath, refreshStorageUrls, formatIstoricValoare, CAMP_LABELS, parseNumber
} from "../../utils/claimUtils";
import {
  generateazaPDF, generateazaProcesVerbalMasinaSchimb, generateazaFisaIntrareService
} from "../../utils/pdfGenerator";
import { downloadClaimAsZip } from "../../utils/zipUtils";
import DocumentCropModal from "../common/DocumentCropModal";
import { supabase } from "../../supabaseClient";
import DatePickerInput from "../common/DatePickerInput";
import StageBar from "../common/StageBar";
import ClaimTimeline from "../common/ClaimTimeline";

function NotionPropertyRow({ icon: Icon, label, children, full }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 p-1 rounded-lg hover:bg-[#F4F1EA] transition-colors border border-transparent hover:border-[#DAD4C6]/40 ${full ? "col-span-1 sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-1.5 min-w-[110px] shrink-0 text-[10px] font-semibold text-[#6B6558]">
        {Icon && <Icon size={12} className="text-[#8A8375] shrink-0" />}
        <span>{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

const SLASH_COMMANDS = [
  { cmd: "/alerta", label: "Alertă / Urgență", prefix: "[ALERTĂ]: ", icon: "🚨", color: "bg-red-50 text-[#B23A2E] border-red-200" },
  { cmd: "/piese", label: "Comandă / Statut Piese", prefix: "[PIESE]: ", icon: "📦", color: "bg-amber-50 text-[#7A5316] border-amber-200" },
  { cmd: "/schimb", label: "Auto la Schimb", prefix: "[AUTO SCHIMB]: ", icon: "🚗", color: "bg-blue-50 text-[#2C4160] border-blue-200" },
  { cmd: "/apel", label: "Apel efectuat Client / Asigurător", prefix: "[APEL CLIENT]: ", icon: "📞", color: "bg-emerald-50 text-[#3E6B45] border-emerald-200" },
  { cmd: "/deviz", label: "Deviz & Reconstatare", prefix: "[DEVIZ]: ", icon: "📋", color: "bg-purple-50 text-[#6B21A8] border-purple-200" },
  { cmd: "/lucrare", label: "Stadiu Reparație Atelier", prefix: "[STADIU LUCRĂRI]: ", icon: "🔧", color: "bg-[#EEF1F3] text-[#3B5166] border-[#DAD4C6]" },
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
              reject(new Error("Eroare la procesarea documentului scanat."));
              return;
            }
            resolve(canvas.toDataURL("image/jpeg", 0.85));
          }, "image/jpeg", 0.85);
        } catch (err) {
          reject(new Error("Eroare la procesarea documentului."));
        }
      };
      img.onerror = () => reject(new Error("Eroare la încărcarea imaginii pentru scanare."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Eroare la citirea fișierului."));
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
  onDelete,
  onNotify,
  onJumpTo,
}) {
  const safeClaim = useMemo(() => sanitizeClaim(claim), [claim]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
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
  const [previewPoza, setPreviewPoza] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [showFinancialAccordion, setShowFinancialAccordion] = useState(false);

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
    setForm((f) => ({ ...f, note: [{ id: uid(), data: nowISO(), text: textToAdd }, ...(f.note || [])] }));
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

  useEffect(() => setForm(sanitizeClaim(claim)), [claim]);

  useEffect(() => {
    let cancelled = false;
    const loadStorageUrls = async () => {
      if (!claim?.id) return;
      const [poze, documente] = await Promise.all([
        refreshStorageUrls(claim.poze || [], "poze-dosare", supabase),
        refreshStorageUrls(claim.documente || [], "documente-dosare", supabase),
      ]);
      if (!cancelled) {
        setForm((current) => ({ ...current, poze, documente }));
      }
    };
    loadStorageUrls();
    return () => { cancelled = true; };
  }, [claim]);

  useEffect(() => {
    if (isNew || !claim?.id) { setIstoric([]); return; }
    setLoadingIstoric(true);
    supabase.from("istoric_dosar").select("*").eq("dosar_id", claim.id).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setIstoric(data || []))
      .finally(() => setLoadingIstoric(false));
  }, [claim?.id, isNew]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setStage = (dept, val) => setForm((f) => ({ ...f, manopera: { ...(f.manopera || {}), [dept]: val } }));
  const setFinancial = (key, value) => setForm((f) => ({ ...f, financiar: { ...(f.financiar || {}), [key]: value } }));

  const financial = form.financiar || {};
  const manoperaFaraTva = parseNumber(form.manopera?.tinichigerie?.facturat, 0) + parseNumber(form.manopera?.vopsitorie?.facturat, 0);
  const pieseFacturateFaraTva = parseNumber(financial.pieseFacturateFaraTva ?? form.valoarePieseAudatex, 0);
  const venitFaraTva = manoperaFaraTva + pieseFacturateFaraTva;
  const tvaProc = parseNumber(financial.tvaProc, 0);
  const tvaValoare = venitFaraTva * tvaProc / 100;
  const totalCuTva = venitFaraTva + tvaValoare;
  const costTotal = parseNumber(form.valoareAchizitiePiese, 0) + parseNumber(financial.costManoperaInterna, 0) + parseNumber(financial.costuriExterne, 0) + parseNumber(financial.costMasinaSchimb, 0);
  const profitBrut = venitFaraTva - costTotal;

  const toggleGata = (checked) => setForm((f) => ({
    ...f,
    gataDeRidicare: checked,
    dataGataRidicare: checked ? nowISO() : null,
    ridicata: false,
    dataRidicare: null,
    status: checked && f.status !== "facturat" ? "gata_de_ridicare" : (!checked && ["gata_de_ridicare", "predat_client"].includes(f.status) ? "in_lucru" : f.status),
  }));

  const toggleRidicata = (checked) => setForm((f) => ({
    ...f,
    ridicata: checked,
    dataRidicare: checked ? nowISO() : null,
    status: checked && f.status !== "facturat" ? "predat_client" : (!checked && f.status === "predat_client" ? "gata_de_ridicare" : f.status),
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

  const handleSave = (openProgramator = false) => {
    const numarDosar = (form.numarDosar || "").trim();
    const numarInmatriculare = (form.numarInmatriculare || "").trim().toUpperCase();
    const vin = (form.vin || "").trim().toUpperCase();
    const telefonClient = (form.telefonClient || "").trim();

    if (!numarDosar) { onNotify("Introduceți numărul dosarului.", "error"); return; }
    if (!numarInmatriculare) { onNotify("Introduceți numărul de înmatriculare.", "error"); return; }
    if (telefonClient && !isValidPhone(telefonClient)) {
      onNotify("Telefonul trebuie să conțină între 7 și 15 cifre.", "error");
      return;
    }

    const duplicateDosar = Array.isArray(allClaims) ? allClaims.find((c) =>
      c && c.id && c.id !== claim?.id && normalizedText(c.numarDosar) === normalizedText(numarDosar)
    ) : null;
    if (duplicateDosar) {
      onNotify(`Numărul de dosar „${numarDosar}” este deja folosit de un alt dosar.`, "error");
      return;
    }

    if (isNew && Array.isArray(allClaims)) {
      const duplicat = allClaims.find((c) =>
        c && (c.numarInmatriculare || "").trim().toUpperCase() === numarInmatriculare &&
        c.status !== "facturat"
      );
      if (duplicat) {
        const ok = confirm(`Există deja un dosar activ pentru ${form.numarInmatriculare} (dosarul ${duplicat.numarDosar || "—"}, status „${getStatusDefinition(duplicat.status).label}"). Continui oricum?`);
        if (!ok) return;
      }
    }

    let effectiveStatus = form.status;
    if (form.ridicata && form.status !== "facturat") {
      effectiveStatus = "predat_client";
    } else if (form.gataDeRidicare && form.status !== "facturat" && form.status !== "predat_client") {
      effectiveStatus = "gata_de_ridicare";
    } else if (form.dataProgramare && form.status === "piese_sosite") {
      effectiveStatus = "programat";
    }

    const deliveryState = effectiveStatus === "predat_client"
      ? {
          gataDeRidicare: true,
          dataGataRidicare: form.dataGataRidicare || nowISO(),
          ridicata: true,
          dataRidicare: form.dataRidicare || nowISO(),
        }
      : effectiveStatus === "gata_de_ridicare"
      ? {
          gataDeRidicare: true,
          dataGataRidicare: form.dataGataRidicare || nowISO(),
          ridicata: false,
          dataRidicare: null,
        }
      : {};

    const statusChanged = effectiveStatus !== claim.status;
    if (statusChanged && effectiveStatus === "facturat") {
      const faraValori = !form.manopera.tinichigerie.facturat && !form.manopera.vopsitorie.facturat &&
        !form.valoarePieseAudatex && !form.valoareAchizitiePiese;
      if (faraValori) {
        const ok = confirm("Nu ai completat nicio valoare de manoperă sau piese pentru acest dosar. Sigur vrei să-l marchezi ca facturat?");
        if (!ok) return;
      }
    }

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
    }, { openProgramator });
  };

  const insertSlashCommand = (prefix) => {
    setNoteText((prev) => (prev.startsWith("/") ? prefix : prefix + prev));
  };

  const removeNote = (id) => setForm((f) => ({ ...f, note: f.note.filter((n) => n.id !== id) }));

  const removeDoc = async (id) => {
    const doc = form.documente.find((d) => d.id === id);
    if (doc?.path) {
      const { error } = await supabase.storage.from("documente-dosare").remove([doc.path]);
      if (error) {
        onNotify(`Nu am putut șterge documentul „${doc.nume || ""}”: ${error.message}`, "error");
        return;
      }
    }
    setForm((f) => ({ ...f, documente: f.documente.filter((d) => d.id !== id) }));
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
      const { data: signed, error: signedError } = await supabase.storage.from("poze-dosare").createSignedUrl(path, 60 * 60);
      if (signedError) {
        await supabase.storage.from("poze-dosare").remove([path]);
        onNotify(`Eroare la generarea linkului pentru „${file.name}”: ${signedError.message}`, "error");
        continue;
      }
      noi.push({ id: uid(), path, url: signed?.signedUrl || "", nume: file.name, categoria, incarcatLa: nowISO() });
    }
    setForm((f) => ({ ...f, poze: [...noi, ...f.poze] }));
    setUploadingPoze(false);
    if (noi.length) onNotify(`${noi.length} fotografie(i) încărcată(e) în categoria „${categoria}”.`, "success");
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
      const { data: signed, error: signedError } = await supabase.storage.from("documente-dosare").createSignedUrl(path, 60 * 60);
      if (signedError) {
        await supabase.storage.from("documente-dosare").remove([path]);
        onNotify(`Eroare la generarea linkului pentru „${file.name}”: ${signedError.message}`, "error");
        continue;
      }
      noi.push({ id: uid(), path, url: signed?.signedUrl || "", nume: file.name, incarcatLa: nowISO() });
    }
    setForm((f) => ({ ...f, documente: [...noi, ...f.documente] }));
    setUploadingDocumente(false);
    if (noi.length) onNotify(`${noi.length} document(e) încărcat(e).`, "success");
  };

  const handleStartScanSession = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploadingDocumente(true);
    try {
      const pageDataUrls = [];
      for (const file of files) {
        const dataUrl = await processScanImage(file);
        pageDataUrls.push(dataUrl);
      }

      const defaultName = `Scan_${form.numarInmatriculare || "Dosar"}_${todayISO()}`;
      setScanSession({
        fileName: defaultName,
        pages: pageDataUrls,
        saveAsPdf: true,
        saveAsPhotos: false,
      });
    } catch (err) {
      onNotify(err.message, "error");
    } finally {
      setUploadingDocumente(false);
    }
  };

  const handleAddPageToScan = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    try {
      const newPages = [];
      for (const file of files) {
        const dataUrl = await processScanImage(file);
        newPages.push(dataUrl);
      }
      setScanSession(prev => ({
        ...prev,
        pages: [...prev.pages, ...newPages]
      }));
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
    setForm((f) => ({ ...f, poze: f.poze.filter((p) => p.id !== poza.id) }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-3 overflow-hidden">
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
        className="relative bg-[#FAF8F5] w-full h-full sm:h-auto sm:max-h-[94vh] sm:max-w-5xl rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-[#DAD4C6] flex flex-col overflow-hidden"
      >
        
        {/* Notion Top Bar Navigation & Actions */}
        <div 
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between px-3 py-2 bg-[#1C2127] text-white shrink-0 select-none border-b border-white/10"
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="text-[16px] shrink-0">📄</span>
            <div className="min-w-0">
              <span className="font-extrabold text-[13px] tracking-tight block text-white truncate">
                {isNew ? "Dosar Nou" : (form.numarDosar ? `Dosar ${form.numarDosar}` : "Dosar Fără Număr")}
              </span>
              <span className="text-[10px] text-[#A69F91] font-mono block truncate">
                {form.numarInmatriculare ? `🚗 ${form.numarInmatriculare}` : "Fără nr."} · {form.marcaModel || "Model neprecizat"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isNew && (
              <div className="flex items-center gap-1">
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

                {/* DROPDOWN UNIFICAT PENTRU GENERARE PDF */}
                <select
                  onChange={async (e) => {
                    const val = e.target.value;
                    if (val === "pdf") await generateazaPDF(form, istoric);
                    if (val === "fisa") await generateazaFisaIntrareService(form);
                    if (val === "schimb" && form.masinaSchimb) generateazaProcesVerbalMasinaSchimb(form);
                    e.target.value = "";
                  }}
                  className="bg-[#2C333D] border border-white/20 text-white text-[10.5px] font-bold rounded-lg px-2 py-1 cursor-pointer focus:outline-none hover:bg-white/10 transition-colors"
                  title="Generează și descarcă documente PDF"
                >
                  <option value="">📄 Export PDF ▾</option>
                  <option value="pdf">📄 Proces-Verbal General</option>
                  <option value="fisa">📄 Fișă Intrare Service</option>
                  {form.masinaSchimb && <option value="schimb">🚗 PV Auto la Schimb</option>}
                </select>
              </div>
            )}
            <button onClick={onClose} className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors ml-1 cursor-pointer">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* BARA DE TAB-URI COMPACTĂ LA TOP */}
        <div className="bg-[#23282E] px-3 py-1.5 border-b border-[#3B424E] flex items-center justify-between gap-1.5 overflow-x-auto text-[11px] shrink-0 scrollbar-none z-30">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                activeTab === "general" ? "bg-[#C98A2B] text-white shadow-xs" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              }`}
            >
              <FileText size={14} /> Date Dosar &amp; Vehicul
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("media")}
              className={`px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                activeTab === "media" ? "bg-[#C98A2B] text-white shadow-xs" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              }`}
            >
              <ImageIcon size={14} /> Poze &amp; Documente
              {((Array.isArray(form.poze) ? form.poze.length : 0) + (Array.isArray(form.documente) ? form.documente.length : 0)) > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-white/20 font-mono">
                  {(Array.isArray(form.poze) ? form.poze.length : 0) + (Array.isArray(form.documente) ? form.documente.length : 0)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("financial")}
              className={`px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                activeTab === "financial" ? "bg-[#C98A2B] text-white shadow-xs" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              }`}
            >
              <Wallet size={14} /> Financiar &amp; Audatex
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                activeTab === "history" ? "bg-[#C98A2B] text-white shadow-xs" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              }`}
            >
              <History size={14} /> Istoric &amp; Notițe
              {Array.isArray(form.note) && form.note.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-white/20 font-mono">
                  {form.note.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {readOnly && (
          <div className="px-4 py-1.5 bg-[#EFEAE1] text-[#6B6558] text-[11px] flex items-center gap-1.5 shrink-0 border-b border-[#DAD4C6] font-medium">
            <ShieldCheck size={13} className="text-[#C98A2B]" /> Vizualizare restricționată — Dosar creat de {form.createdByEmail || "alt operator"}.
          </div>
        )}

        {/* MAIN BODY CONTAINER */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#FAF8F5]">
          <fieldset disabled={readOnly} className="border-0 m-0 p-0 min-w-0">
            <div className="p-3 space-y-3 font-sans">

              {/* ========================================================================= */}
              {/* TAB 1: DATE DOSAR & VEHICUL                                               */}
              {/* ========================================================================= */}
              {activeTab === "general" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-end">
                    <span className="text-[10.5px] font-semibold text-[#8A8375]">
                      ID: <code className="font-mono text-[#23282E] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#DAD4C6]">{form.id?.slice(0, 8) || "Nou"}</code>
                    </span>
                  </div>

                  {/* Grid cu 2 Coloane Spațioase: Date Dosar & Date Vehicul */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">

                    {/* COLOANA 1: DATE DOSAR */}
                    <div className="bg-white border border-[#DAD4C6] rounded-xl p-3 space-y-2 shadow-2xs">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B6558] border-b border-[#DAD4C6]/60 pb-1 flex items-center gap-1.5">
                        <FileText size={13} className="text-[#6B6558]" /> 1. Date Dosar
                      </div>

                      {/* 1. Nr. Dosar Daună */}
                      <div>
                        <label className="block text-[10.5px] font-bold text-[#6B6558] mb-0.5 flex items-center gap-1">
                          <FileText size={12} className="text-[#6B6558]" /> Nr. Dosar Daună
                        </label>
                        <input
                          className="w-full font-bold text-[12px] p-1.5 border border-[#DAD4C6] rounded-lg bg-white uppercase text-[#23282E] focus:border-[#3B5166]"
                          value={form.numarDosar}
                          onChange={(e) => set("numarDosar", e.target.value.toUpperCase())}
                          placeholder="ex: 2026-00451"
                          required
                        />
                      </div>

                      {/* Dată Deschidere Dosar */}
                      <div>
                        <label className="block text-[10.5px] font-bold text-[#6B6558] mb-0.5 flex items-center gap-1">
                          <Calendar size={12} className="text-[#6B6558]" /> Dată Deschidere / Intrare Dosar
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
                        <label className="block text-[10.5px] font-bold text-[#6B6558] mb-0.5 flex items-center gap-1">
                          <ShieldCheck size={12} className="text-[#6B6558]" /> Asigurător &amp; Tip Asigurare
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            className="col-span-1 font-bold text-[11.5px] p-1.5 border border-[#DAD4C6] rounded-lg bg-white text-[#23282E]"
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
                            className={`col-span-2 text-[11.5px] p-1.5 border border-[#DAD4C6] rounded-lg bg-white font-semibold text-[#23282E] ${
                              form.tipAsigurare === "Fără asigurare" ? "opacity-50 bg-[#EFEAE1] cursor-not-allowed" : ""
                            }`}
                            value={form.asigurator}
                            onChange={(e) => set("asigurator", e.target.value)}
                          >
                            <option value="">{form.tipAsigurare === "Fără asigurare" ? "-- Fără asigurător --" : "-- Societate Asigurare --"}</option>
                            {(Array.isArray(insurersList) && insurersList.length > 0 ? insurersList : INSURERS).map((i) => <option key={i} value={i}>{i}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Dată Comandă Piese */}
                      {form.status === "piese_comandate" && (
                        <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-xl">
                          <label className="block text-[10.5px] font-bold text-[#7A5316] mb-0.5 flex items-center gap-1">
                            <CalendarClock size={12} className="text-[#7A5316]" /> Dată Comandă Piese
                          </label>
                          <DatePickerInput
                            value={form.dataComandaPiese}
                            onChange={(v) => set("dataComandaPiese", v)}
                            withTime={false}
                            placeholder="zi/lună/an"
                          />
                        </div>
                      )}

                      {/* Piese sosite checkbox */}
                      {form.status === "piese_comandate" && (
                        <label className="flex items-center gap-2 text-[11.5px] font-bold text-[#3E6B45] cursor-pointer bg-[#EEF5EE] p-2 rounded-xl border border-[#3E6B45]/20">
                          <input
                            type="checkbox"
                            checked={!!form.pieseSosite}
                            onChange={(e) => set("pieseSosite", e.target.checked)}
                            className="rounded accent-[#3E6B45] w-4 h-4"
                          />
                          <span>Confirmare: Toate piesele au sosit în service</span>
                        </label>
                      )}

                      {/* Linii reparații */}
                      <div className="space-y-1.5 border-t border-[#DAD4C6]/60 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10.5px] font-extrabold text-[#6B6558] uppercase flex items-center gap-1">
                            <Wrench size={12} className="text-[#6B6558]" /> Operațiuni de efectuat (linii &amp; bife)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const newList = [...(form.operatiuni || []), { id: uid(), piesa: "", inl: false, rev: false, rep: false, uni: false }];
                              set("operatiuni", newList);
                            }}
                            className="text-[10px] font-extrabold text-[#3B5166] hover:bg-[#EFEAE1] px-2 py-0.5 rounded border border-[#DAD4C6] flex items-center gap-1"
                          >
                            + Adaugă Linie
                          </button>
                        </div>

                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {(!form.operatiuni || form.operatiuni.length === 0) ? (
                            <div className="text-[10.5px] text-[#8A8375] italic p-2 border border-dashed border-[#DAD4C6] rounded-lg text-center">
                              Nicio linie adăugată. Apasă pe „+ Adaugă Linie” de mai sus.
                            </div>
                          ) : (
                            form.operatiuni.map((op, idx) => (
                              <div key={op.id || idx} className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#DAD4C6]">
                                <input
                                  className="flex-1 font-semibold text-[11px] px-1.5 py-0.5 border border-[#DAD4C6] rounded uppercase text-[#23282E]"
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
                                  <label className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border ${op.inl ? "bg-[#B8791E] text-white border-[#B8791E]" : "bg-[#FAF8F5] text-[#6B6558] border-[#DAD4C6] hover:bg-gray-100"}`} title="Înlocuire">
                                    <input type="checkbox" checked={!!op.inl} onChange={(e) => { const newList = [...form.operatiuni]; newList[idx] = { ...newList[idx], inl: e.target.checked }; set("operatiuni", newList); }} className="hidden" /> INL
                                  </label>
                                  <label className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border ${op.rev ? "bg-[#3B5166] text-white border-[#3B5166]" : "bg-[#FAF8F5] text-[#6B6558] border-[#DAD4C6] hover:bg-gray-100"}`} title="Revopsire">
                                    <input type="checkbox" checked={!!op.rev} onChange={(e) => { const newList = [...form.operatiuni]; newList[idx] = { ...newList[idx], rev: e.target.checked }; set("operatiuni", newList); }} className="hidden" /> REV
                                  </label>
                                  <label className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border ${op.rep ? "bg-[#3E6B45] text-white border-[#3E6B45]" : "bg-[#FAF8F5] text-[#6B6558] border-[#DAD4C6] hover:bg-gray-100"}`} title="Reparație">
                                    <input type="checkbox" checked={!!op.rep} onChange={(e) => { const newList = [...form.operatiuni]; newList[idx] = { ...newList[idx], rep: e.target.checked }; set("operatiuni", newList); }} className="hidden" /> REP
                                  </label>
                                  <label className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border ${op.uni ? "bg-[#2C4160] text-white border-[#2C4160]" : "bg-[#FAF8F5] text-[#6B6558] border-[#DAD4C6] hover:bg-gray-100"}`} title="Demontare / Montare">
                                    <input type="checkbox" checked={!!op.uni} onChange={(e) => { const newList = [...form.operatiuni]; newList[idx] = { ...newList[idx], uni: e.target.checked }; set("operatiuni", newList); }} className="hidden" /> UNI
                                  </label>
                                  <button type="button" onClick={() => { const newList = form.operatiuni.filter((_, i) => i !== idx); set("operatiuni", newList); set("ceEsteDeReparat", newList.map((o) => o.piesa).filter(Boolean).join(", ")); }} className="p-1 text-[#B23A2E] hover:bg-red-50 rounded-lg transition-colors ml-0.5" title="Șterge linia">
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
                    <div className="bg-white border border-[#DAD4C6] rounded-xl p-3 space-y-2.5 shadow-2xs">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B6558] border-b border-[#DAD4C6]/60 pb-1 flex items-center gap-1.5">
                        <Car size={13} className="text-[#6B6558]" /> 2. Date Vehicul, Proprietar &amp; Delegat
                      </div>

                      {/* Nr. Înmatriculare */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#6B6558] mb-1 flex items-center gap-1">
                          <Car size={13} className="text-[#6B6558]" /> Nr. Înmatriculare
                        </label>
                        <input
                          className="w-full font-mono font-bold text-[12.5px] p-1.5 border border-[#DAD4C6] rounded-lg bg-white uppercase text-[#23282E] focus:border-[#3B5166]"
                          value={form.numarInmatriculare}
                          onChange={(e) => set("numarInmatriculare", e.target.value.toUpperCase())}
                          placeholder="ex: B111AAA"
                          required
                        />
                      </div>

                      {/* Serie Șasiu (VIN) */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#6B6558] mb-1 flex items-center gap-1">
                          <Tag size={13} className="text-[#6B6558]" /> Serie Șasiu (VIN 17 caractere)
                        </label>
                        <input
                          className="w-full font-mono text-[12px] p-1.5 border border-[#DAD4C6] rounded-lg bg-white uppercase text-[#23282E] focus:border-[#3B5166]"
                          value={form.vin}
                          onChange={(e) => set("vin", e.target.value.toUpperCase())}
                          maxLength={17}
                          placeholder="Cod VIN 17 caractere"
                        />
                      </div>

                      {/* Marcă & Model */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#6B6558] mb-1 flex items-center gap-1">
                          <Car size={13} className="text-[#6B6558]" /> Marcă &amp; Model Vehicul
                        </label>
                        <input
                          className="w-full text-[12px] p-1.5 border border-[#DAD4C6] rounded-lg bg-white uppercase text-[#23282E] focus:border-[#3B5166]"
                          value={form.marcaModel}
                          onChange={(e) => set("marcaModel", e.target.value.toUpperCase())}
                          placeholder="ex: VOLKSWAGEN PASSAT 2.0 TDI"
                        />
                      </div>

                      {/* Proprietar & Delegat */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-[#6B6558] mb-1 flex items-center gap-1">
                            <UserIcon size={13} className="text-[#6B6558]" /> Proprietar Auto
                          </label>
                          <input
                            className="w-full font-semibold text-[12px] p-1.5 border border-[#DAD4C6] rounded-lg bg-white uppercase text-[#23282E] focus:border-[#3B5166]"
                            value={form.client}
                            onChange={(e) => set("client", e.target.value.toUpperCase())}
                            placeholder="Nume proprietar auto"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#6B6558] mb-1 flex items-center gap-1">
                            <UserIcon size={13} className="text-[#6B6558]" /> Delegat
                          </label>
                          <input
                            className="w-full text-[12px] p-1.5 border border-[#DAD4C6] rounded-lg bg-white uppercase text-[#23282E] focus:border-[#3B5166]"
                            value={form.delegat || ""}
                            onChange={(e) => set("delegat", e.target.value.toUpperCase())}
                            placeholder="Nume delegat (opțional)"
                          />
                        </div>
                      </div>

                      {/* Telefon contact */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#6B6558] mb-1 flex items-center gap-1">
                          <Phone size={13} className="text-[#6B6558]" /> Telefon Contact
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            className="flex-1 font-mono text-[11.5px] p-1.5 border border-[#DAD4C6] rounded-lg bg-white"
                            type="tel"
                            placeholder="07xx xxx xxx"
                            value={form.telefonClient}
                            onChange={(e) => set("telefonClient", e.target.value)}
                          />
                          {form.telefonClient && (
                            <>
                              <a href={telLink(form.telefonClient)} title="Sună client" className="shrink-0 p-1.5 rounded-lg bg-white border border-[#DAD4C6] hover:bg-[#EFEAE1] text-[#3B5166] transition-colors"><Phone size={12} /></a>
                              <a href={waLink(form.telefonClient, `Buna ziua! Va contactam de la service referitor la dosarul dvs. ${form.numarDosar || ""} (${form.numarInmatriculare || ""}).`)} target="_blank" rel="noreferrer" title="WhatsApp" className="shrink-0 p-1.5 rounded-lg bg-[#EEF5EE] border border-[#3E6B45]/30 hover:bg-[#D3E8D5] text-[#3E6B45] transition-colors"><MessageCircle size={12} /></a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* BARA INTERACTIVĂ DE STADII FLUX */}
                    <div className="col-span-1 md:col-span-2 bg-white border border-[#DAD4C6] rounded-xl p-2.5 shadow-2xs space-y-2">
                      {/* 9 Segmented Progress Bar */}
                      <div className="flex items-center gap-1 h-2.5 w-full bg-[#EFEAE1] rounded-full overflow-hidden p-0.5">
                        {STATUSES.map((s, idx) => {
                          const curIdx = Math.max(0, STATUSES.findIndex((x) => x.key === form.status));
                          const isDone = idx < curIdx;
                          const isCurrent = idx === curIdx;
                          const phaseColor = getPhaseColors(s.phase)?.bar || "#3B5166";

                          return (
                            <button
                              key={s.key}
                              type="button"
                              onClick={() => {
                                setForm((f) => ({
                                  ...f,
                                  status: s.key,
                                  dataSchimbareStatus: f.status !== s.key ? nowISO() : f.dataSchimbareStatus,
                                }));
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

                      {/* Status Label & Dropdown Select */}
                      <div className="flex items-center justify-between text-[11.5px] pt-0.5">
                        <span className="font-extrabold text-[#3B5166] flex items-center gap-1.5">
                          <Layers size={13} className="text-[#C98A2B]" />
                          <span>Etapa curentă ({STATUSES.findIndex((s) => s.key === form.status) + 1}/9):</span>
                        </span>

                        <select
                          value={form.status}
                          onChange={(e) => {
                            const newStatusKey = e.target.value;
                            setForm((f) => ({
                              ...f,
                              status: newStatusKey,
                              dataSchimbareStatus: f.status !== newStatusKey ? nowISO() : f.dataSchimbareStatus,
                            }));
                          }}
                          className="font-bold text-[11.5px] py-1 px-2.5 border border-[#DAD4C6] rounded-lg bg-[#FAF8F5] text-[#23282E] focus:border-[#3B5166] cursor-pointer"
                        >
                          {STATUSES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {String(s.num).padStart(2, "0")}. {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* STARE FIZICĂ & MAȘINĂ LA SCHIMB */}
                  <div className="grid md:grid-cols-2 gap-3 pt-1">
                    {/* Stepper Stare Fizică */}
                    <div className="bg-white border border-[#DAD4C6] rounded-xl p-3 space-y-3 shadow-2xs">
                      <div className="text-[12px] font-bold uppercase tracking-wide text-[#3B5166] flex items-center justify-between border-b border-[#DAD4C6] pb-1.5">
                        <span className="flex items-center gap-1.5"><Wrench size={14} /> Stare Fizică &amp; Lucrări</span>
                        {!isNew && (
                          <button type="button" onClick={() => generateazaFisaIntrareService(form)} className="text-[11px] font-semibold text-[#3B5166] hover:underline flex items-center gap-1">
                            <FileDown size={12} /> Fișă service
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mașină la Schimb */}
                    <div className="bg-white border border-[#DAD4C6] rounded-xl p-3 space-y-2 shadow-2xs">
                      <div className="text-[12px] font-bold uppercase tracking-wide text-[#3B5166] flex items-center justify-between border-b border-[#DAD4C6] pb-1.5">
                        <span className="flex items-center gap-1.5"><Car size={14} /> Mașină la Schimb</span>
                        {!isNew && form.masinaSchimb && (
                          <button type="button" onClick={() => generateazaProcesVerbalMasinaSchimb(form)} className="text-[11px] font-semibold text-[#7A5316] hover:underline flex items-center gap-1">
                            <FileDown size={12} /> PV Auto Schimb
                          </button>
                        )}
                      </div>

                      <label className="flex items-center gap-2 text-[11.5px] font-bold text-[#6B6558] cursor-pointer">
                        <input type="checkbox" checked={form.masinaSchimb} onChange={(e) => set("masinaSchimb", e.target.checked)} className="rounded border-[#DAD4C6]" />
                        <span>S-a oferit mașină la schimb (Rent-a-car)</span>
                      </label>

                      {form.masinaSchimb && (
                        <div className="space-y-2 pt-1 border-t border-[#DAD4C6]">
                          <div>
                            <label className="block text-[10.5px] font-semibold text-[#6B6558] mb-1">Model Mașină Oferită</label>
                            <input className="w-full text-[12px] p-1.5 border border-[#DAD4C6] rounded-lg uppercase bg-[#FAF8F5]" placeholder="ex: HYUNDAI I20 (B100ABC)" value={form.masinaSchimbModel || ""} onChange={(e) => set("masinaSchimbModel", e.target.value.toUpperCase())} />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <label className="block text-[10.5px] font-semibold text-[#6B6558] mb-1">Dată Predare Auto</label>
                              <DatePickerInput value={form.dataPredareMasinaSchimb} onChange={(v) => set("dataPredareMasinaSchimb", v)} withTime={false} placeholder="zi/lună/an" />
                            </div>

                            <div>
                              <label className="block text-[10.5px] font-semibold text-[#6B6558] mb-1">Zile Chirie Audatex</label>
                              <input type="number" min={0} className="w-full p-1.5 border border-[#DAD4C6] rounded-lg font-mono font-bold text-[12px] bg-[#FAF8F5]" value={form.zileChirieAudatex || 0} onChange={(e) => set("zileChirieAudatex", Number(e.target.value) || 0)} />
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
                  <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-3 shadow-2xs flex flex-col">
                    <div className="text-[12px] font-bold uppercase tracking-wide text-[#3B5166] flex items-center justify-between border-b border-[#DAD4C6] pb-1.5">
                      <span className="flex items-center gap-1.5"><ImageIcon size={14} /> Galerie Poze ({form.poze.length})</span>
                      <button type="button" onClick={handleDownloadZip} disabled={downloadingZip || form.poze.length === 0} className="text-[11px] font-bold text-[#3B5166] hover:underline flex items-center gap-1 disabled:opacity-40">
                        <Download size={12} /> Descarcă ZIP
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[10.5px] font-bold text-[#6B6558]">Adaugă poze direct în Categorie:</div>
                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        <label className="flex items-center justify-center gap-1 border border-dashed border-[#3B5166]/40 rounded-lg p-2 bg-[#FAF8F5] hover:bg-[#EEF1F3] cursor-pointer text-[#3B5166] font-bold text-center">
                          <span>🚗 Recepție</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files, "receptie")} />
                        </label>
                        <label className="flex items-center justify-center gap-1 border border-dashed border-[#C98A2B]/40 rounded-lg p-2 bg-[#FAF8F5] hover:bg-[#FBF3E6] cursor-pointer text-[#7A5316] font-bold text-center">
                          <span>📋 Reconstatare</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files, "reconstatare")} />
                        </label>
                        <label className="flex items-center justify-center gap-1 border border-dashed border-[#3E6B45]/40 rounded-lg p-2 bg-[#FAF8F5] hover:bg-[#EEF5EE] cursor-pointer text-[#3E6B45] font-bold text-center">
                          <span>✨ Predare</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files, "predare")} />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#DAD4C6]">
                      <label className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2 text-[11.5px] cursor-pointer transition-all ${uploadingPoze ? "opacity-50 pointer-events-none" : "hover:bg-[#FAF8F5] border-[#DAD4C6] text-[#6B6558] font-bold"}`}>
                        {uploadingPoze ? <><Loader2 size={13} className="animate-spin" /> Se încarcă...</> : <><Upload size={13} /> Galerie generală</>}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files, "generale")} />
                      </label>
                      <label className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2 text-[11.5px] cursor-pointer transition-all ${uploadingPoze ? "opacity-50 pointer-events-none" : "hover:bg-[#FAF8F5] border-[#DAD4C6] text-[#6B6558] font-bold"}`}>
                        {uploadingPoze ? <><Loader2 size={13} className="animate-spin" /> Cameră...</> : <><Car size={13} /> Cameră auto</>}
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleUploadPoze(e.target.files, "generale")} />
                      </label>
                    </div>

                    {form.poze.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1 pt-1">
                        {form.poze.map((p) => (
                          <div key={p.id} className="relative group rounded-lg overflow-hidden border border-[#DAD4C6] bg-black/5 aspect-square">
                            <button type="button" onClick={() => setPreviewPoza(p)} className="w-full h-full block text-left">
                              <img src={p.url} alt={p.nume} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </button>
                            {p.categoria && p.categoria !== "generale" && (
                              <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded uppercase">
                                {p.categoria}
                              </span>
                            )}
                            <button type="button" onClick={() => removePoza(p)} className="absolute top-1 right-1 bg-black/70 hover:bg-[#B23A2E] text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[12px] text-[#8A8375] italic p-8 text-center border border-dashed border-[#DAD4C6] rounded-xl bg-[#FAF8F5]">
                        Nicio fotografie adăugată. Adaugă poze folosind butoanele de mai sus.
                      </div>
                    )}
                  </div>

                  {/* Documente PDF & Scaner Pro */}
                  <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-3 shadow-2xs flex flex-col">
                    <div className="text-[12px] font-bold uppercase tracking-wide text-[#3B5166] flex items-center justify-between border-b border-[#DAD4C6] pb-1.5">
                      <span className="flex items-center gap-1.5"><FolderOpen size={14} /> Documente PDF &amp; Scanate ({form.documente.length})</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2.5 text-[12px] cursor-pointer transition-all ${uploadingDocumente ? "opacity-50 pointer-events-none" : "hover:bg-[#FAF8F5] border-[#3B5166]/40 text-[#3B5166] font-bold"}`}>
                        {uploadingDocumente ? <><Loader2 size={13} className="animate-spin" /> Se încarcă...</> : <><Upload size={13} /> Încarcă documente</>}
                        <input type="file" multiple className="hidden" onChange={(e) => handleUploadDocumente(e.target.files)} />
                      </label>
                      <label className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2.5 text-[12px] cursor-pointer transition-all ${uploadingDocumente ? "opacity-50 pointer-events-none" : "hover:bg-[#FAF8F5] border-[#C98A2B]/40 text-[#7A5316] font-bold"}`}>
                        {uploadingDocumente ? <><Loader2 size={13} className="animate-spin" /> Cameră...</> : <><FileText size={13} /> Scanează &amp; Crop Pro</>}
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => setCropImageSrc(ev.target.result); reader.readAsDataURL(file); } }} />
                      </label>
                    </div>

                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {form.documente.map((d) => (
                        <div key={d.id} className="flex items-center justify-between bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg px-3 py-2 text-[12px]">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText size={14} className="text-[#3B5166] shrink-0" />
                            <a href={d.url || d.link} target="_blank" rel="noreferrer" className="text-[#2C4160] font-semibold hover:underline truncate flex-1">{d.nume}</a>
                          </div>
                          <button type="button" onClick={() => removeDoc(d.id)} className="text-[#B23A2E] hover:opacity-70 ml-2 p-1"><Trash2 size={13} /></button>
                        </div>
                      ))}
                      {form.documente.length === 0 && (
                        <div className="text-[12px] text-[#8A8375] italic p-8 text-center border border-dashed border-[#DAD4C6] rounded-xl bg-[#FAF8F5]">
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
                  {/* Secțiunea Valori Deviz & Reglat */}
                  <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-3 shadow-2xs">
                    <div className="text-[12px] font-bold uppercase tracking-wide text-[#3B5166] border-b border-[#DAD4C6] pb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Wallet size={15} className="text-[#C98A2B]" /> Valori Deviz Audatex &amp; Facturare</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
                      <div>
                        <label className="block text-[10.5px] font-bold text-[#6B6558] mb-1">Deviz Audatex (lei)</label>
                        <input type="number" min={0} className="w-full p-2 border border-[#DAD4C6] rounded-lg font-mono font-bold text-[12.5px] bg-white" value={form.valoareDevizAudatex || 0} onChange={(e) => set("valoareDevizAudatex", Number(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-[#6B6558] mb-1">Valoare Reglată (lei)</label>
                        <input type="number" min={0} className="w-full p-2 border border-[#DAD4C6] rounded-lg font-mono font-bold text-[12.5px] bg-white" value={form.valoareAcceptataReglata || 0} onChange={(e) => set("valoareAcceptataReglata", Number(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-[#6B6558] mb-1">Cuantum Rereglat (lei)</label>
                        <input type="number" min={0} className="w-full p-2 border border-[#DAD4C6] rounded-lg font-mono font-bold text-[12.5px] bg-white" value={form.cuantumRereglat || 0} onChange={(e) => set("cuantumRereglat", Number(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-[#6B6558] mb-1">Nr. Factură &amp; Stadiu</label>
                        <input type="text" className="w-full p-2 border border-[#DAD4C6] rounded-lg font-bold text-[12px] bg-white" placeholder="ex: FACT-1029" value={form.numarFactura || ""} onChange={(e) => set("numarFactura", e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Detalii Costuri & Calcul Profit */}
                  <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-3 shadow-2xs">
                    <div className="text-[12px] font-bold uppercase tracking-wide text-[#3B5166] border-b border-[#DAD4C6] pb-1.5">
                      💰 Defalcare Manoperă, Cost Piese &amp; Profitabilitate Reală
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Manoperă & Piese */}
                      <div className="space-y-2 bg-[#FAF8F5] p-3 rounded-xl border border-[#DAD4C6]">
                        <div className="text-[11px] font-bold text-[#6B6558] uppercase">Manoperă &amp; Cost Piese (lei)</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10.5px] font-semibold text-[#6B6558] mb-1">Tinichigerie (lei)</label>
                            <input type="number" min={0} className="w-full p-2 border border-[#DAD4C6] rounded-lg font-mono font-bold text-[#23282E] text-[12.5px] bg-white" value={financial.manoperaTinichigerie || 0} onChange={(e) => setFinancial("manoperaTinichigerie", Number(e.target.value) || 0)} />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-semibold text-[#6B6558] mb-1">Vopsitorie (lei)</label>
                            <input type="number" min={0} className="w-full p-2 border border-[#DAD4C6] rounded-lg font-mono font-bold text-[#23282E] text-[12.5px] bg-white" value={financial.manoperaVopsitorie || 0} onChange={(e) => setFinancial("manoperaVopsitorie", Number(e.target.value) || 0)} />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-semibold text-[#6B6558] mb-1">Cost Piese Înlocuire (lei)</label>
                          <input type="number" min={0} className="w-full p-2 border border-[#DAD4C6] rounded-lg font-mono font-bold text-[#23282E] text-[12.5px] bg-white" value={financial.costPiese || 0} onChange={(e) => setFinancial("costPiese", Number(e.target.value) || 0)} />
                        </div>
                      </div>

                      {/* Costuri Externe & Masina Schimb */}
                      <div className="space-y-2 bg-[#FAF8F5] p-3 rounded-xl border border-[#DAD4C6]">
                        <div className="text-[11px] font-bold text-[#6B6558] uppercase">Alte Costuri Externe (lei)</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10.5px] font-semibold text-[#6B6558] mb-1">Costuri Externe</label>
                            <input type="number" min={0} className="w-full p-2 border border-[#DAD4C6] rounded-lg font-mono font-bold text-[#23282E] text-[12.5px] bg-white" value={financial.costuriExterne || 0} onChange={(e) => setFinancial("costuriExterne", Number(e.target.value) || 0)} />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-semibold text-[#6B6558] mb-1">Cost Auto Schimb</label>
                            <input type="number" min={0} className="w-full p-2 border border-[#DAD4C6] rounded-lg font-mono font-bold text-[#23282E] text-[12.5px] bg-white" value={financial.costMasinaSchimb || 0} onChange={(e) => setFinancial("costMasinaSchimb", Number(e.target.value) || 0)} />
                          </div>
                        </div>

                        <div className="p-3 rounded-xl border border-[#DAD4C6] bg-white flex items-center justify-between text-[12px] mt-2">
                          <span className="font-bold text-[#6B6558]">Total Costuri Reale:</span>
                          <span className="font-mono font-bold text-[14px] text-[#B23A2E]">{costTotal.toLocaleString("ro-RO")} lei</span>
                        </div>
                      </div>
                    </div>

                    {/* Summary KPI Card */}
                    <div className="p-3 rounded-xl border border-[#DAD4C6] bg-[#FAF8F5] shadow-xs mt-2">
                      <div className="text-[12px] font-bold uppercase tracking-wide text-[#3B5166] border-b border-[#DAD4C6] pb-1.5 mb-2 flex items-center justify-between">
                        <span>📊 Rezultat Financiar &amp; Profitabilitate Reală Dosar</span>
                        <span className="text-[10.5px] text-[#8A8375] font-normal uppercase">Calculat automat fără TVA</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div className="p-2.5 rounded-xl bg-white border border-[#DAD4C6]">
                          <div className="text-[10px] text-[#8A8375] font-bold uppercase">Venit Net (fără TVA)</div>
                          <div className="text-[15px] font-mono font-bold text-[#2C4160] mt-0.5">{venitFaraTva.toLocaleString("ro-RO")} <span className="text-[10px]">lei</span></div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-[#DAD4C6]">
                          <div className="text-[10px] text-[#8A8375] font-bold uppercase">Total Costuri</div>
                          <div className="text-[15px] font-mono font-bold text-[#B23A2E] mt-0.5">{costTotal.toLocaleString("ro-RO")} <span className="text-[10px]">lei</span></div>
                        </div>
                        <div className={`p-2.5 rounded-xl border ${profitBrut >= 0 ? "bg-[#3E6B45]/10 border-[#3E6B45]/30 text-[#3E6B45]" : "bg-[#B23A2E]/10 border-[#B23A2E]/30 text-[#B23A2E]"}`}>
                          <div className="text-[10px] font-bold uppercase">Profit Brut</div>
                          <div className="text-[15px] font-mono font-bold mt-0.5">{profitBrut.toLocaleString("ro-RO")} <span className="text-[10px]">lei</span></div>
                        </div>
                        <div className={`p-2.5 rounded-xl border ${profitBrut >= 0 ? "bg-[#3E6B45]/10 border-[#3E6B45]/30 text-[#3E6B45]" : "bg-[#B23A2E]/10 border-[#B23A2E]/30 text-[#B23A2E]"}`}>
                          <div className="text-[10px] font-bold uppercase">Marjă Profit</div>
                          <div className="text-[15px] font-mono font-bold mt-0.5">{venitFaraTva > 0 ? ((profitBrut / venitFaraTva) * 100).toFixed(1) : "0.0"}%</div>
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
                  <div className="bg-white border border-[#DAD4C6] rounded-xl p-3 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-[#DAD4C6] pb-1.5">
                      <h3 className="font-bold text-[12px] text-[#23282E] flex items-center gap-1.5">
                        <Sparkles size={14} className="text-[#C98A2B]" /> Notițe interne echipă ({form.note.length})
                      </h3>
                    </div>

                    <div className="flex gap-2">
                      <input
                        ref={noteInputRef}
                        className="flex-1 p-2 border border-[#DAD4C6] rounded-lg text-[12px] bg-[#FAF8F5] focus:bg-white focus:border-[#C98A2B]"
                        placeholder="Adaugă o notă internă..."
                        value={noteText}
                        onChange={(e) => { setNoteText(e.target.value); setSlashIndex(0); }}
                        onKeyDown={handleNoteKeyDown}
                      />
                      <button
                        type="button"
                        onClick={() => addNote()}
                        className="px-3 py-1.5 bg-[#3B5166] hover:bg-[#2C4160] text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 shrink-0"
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
                              : isParts ? "bg-amber-50/70 border-amber-200 text-[#7A5316]"
                              : isCar ? "bg-blue-50/70 border-blue-200 text-[#2C4160]"
                              : isCall ? "bg-emerald-50/70 border-emerald-200 text-[#294A2E]"
                              : "bg-[#FAF8F5] border-[#DAD4C6] text-[#23282E]"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-[#8A8375] border-b border-black/5 pb-1 mb-1">
                              <span>📅 {fmtDateTime(n.data)}</span>
                              <button type="button" onClick={() => removeNote(n.id)} className="text-[#B23A2E] hover:opacity-80 p-0.5">
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
                        <div className="text-[12.5px] text-[#8A8375] italic p-6 text-center border border-dashed border-[#DAD4C6] rounded-xl bg-[#FAF8F5]">
                          Nicio notă înregistrată.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stepper Statusuri & Istoric Timeline */}
                  {!isNew && (
                    <div className="bg-white border border-[#DAD4C6] rounded-xl p-3 space-y-2 shadow-2xs">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B6558] border-b border-[#DAD4C6]/60 pb-1 flex items-center gap-1.5">
                        <Layers size={13} className="text-[#6B6558]" /> Etape Flux &amp; Jurnal de Activități
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

              {/* MODAL PREVIZUALIZARE POZĂ CU BUTON DE ÎNCHIDERE X (Punctul 12) */}
              {previewPoza && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs">
                  <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center bg-slate-900 rounded-xl overflow-hidden shadow-2xl p-2">
                    <button
                      onClick={() => setPreviewPoza(null)}
                      className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 hover:bg-[#B23A2E] text-white transition-colors"
                      title="Închide previzualizarea"
                    >
                      <X className="w-6 h-6" />
                    </button>

                    <img
                      src={previewPoza.url || previewPoza.dataUrl}
                      alt={previewPoza.nume}
                      className="max-h-[80vh] max-w-full object-contain rounded"
                    />

                    <div className="w-full text-center text-xs text-slate-300 pt-2 font-medium flex items-center justify-between px-4">
                      <span>{previewPoza.nume || "Fotografie"}</span>
                      {previewPoza.categoria && <span className="uppercase font-bold text-amber-400">Categorie: {previewPoza.categoria}</span>}
                      <a href={previewPoza.url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">Deschide original</a>
                    </div>
                  </div>
                </div>
              )}

              {/* CROP MODAL DOCUMENT (Punctul 1) */}
              {cropImageSrc && (
                <DocumentCropModal
                  imageSrc={cropImageSrc}
                  onClose={() => setCropImageSrc(null)}
                  onConfirm={async (croppedDataUrl) => {
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

        {/* NOTION FOOTER DOCKED BAR */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#DAD4C6] bg-white shrink-0 shadow-sm">
          {readOnly ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={() => {
                if (confirm("Ștergi definitiv acest dosar?")) onDelete(claim.id);
              }}
              className="flex items-center gap-1 text-[#B23A2E] text-[12px] font-bold hover:bg-[#B23A2E]/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 size={13} /> Șterge dosar
            </button>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-[#C7C0B0] text-[12.5px] font-bold text-[#4A443A] hover:bg-[#EFEAE1] transition-colors"
            >
              {readOnly ? "Închide" : "Anulează"}
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg bg-[#C98A2B] text-white text-[12.5px] font-extrabold hover:bg-[#B37A22] shadow-sm transition-colors"
              >
                <Save size={14} /> Salvează modificările
              </button>
            )}
          </div>
        </div>

        {/* SCANNER OVERLAY */}
        {scanSession && (
          <div className="absolute inset-0 bg-[#1C2127]/95 z-50 flex flex-col p-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <h3 className="font-bold text-[13.5px] flex items-center gap-1.5 text-[#C98A2B]"><FileText size={16} /> Scanare document pagini multiple</h3>
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
                      className="absolute top-1 right-1 bg-[#B23A2E] text-white rounded p-1 hover:opacity-80"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-white/20 hover:border-white/40 cursor-pointer aspect-[3/4] bg-white/5 transition-all text-center p-2 hover:bg-white/10">
                  <Plus size={20} className="text-[#C98A2B]" />
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
                      className="rounded border-white/20 bg-white/5 text-[#C98A2B] focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Salvează ca PDF unic</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11.5px] font-semibold select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={scanSession.saveAsPhotos} 
                      onChange={(e) => setScanSession(prev => ({ ...prev, saveAsPhotos: e.target.checked }))}
                      className="rounded border-white/20 bg-white/5 text-[#C98A2B] focus:ring-0 focus:ring-offset-0"
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
                  className="flex items-center gap-1 px-5 py-1.5 rounded-lg bg-[#C98A2B] text-white text-[12.5px] font-bold hover:bg-[#B37A22] shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
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
