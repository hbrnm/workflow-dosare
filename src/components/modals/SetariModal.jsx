import React, { useState, useMemo } from "react";
import {
  X, Settings, User, Building, Database, Bell, Wrench, Download,
  CheckCircle2, Plus, Trash2, Key, Sliders, Shield, RefreshCw, Car, ChevronRight, Clock
} from "lucide-react";
import { INSURERS, STATUSES } from "../../constants/config";
import * as XLSX from "xlsx";
import { todayISO } from "../../utils/dateUtils";

export default function SetariModal({
  claims = [],
  capacitateZilnica,
  pragRidicare,
  pragInactivitate = 7,
  onSaveCapacitate,
  onSavePrag,
  onSavePragInactivitate,
  onClose,
  onNotify,
  userEmail,
  onSignOut,
  isAdmin = false,
  usersList = [],
  onAddUser,
  onDeleteUser,
  onToggleAdminRole,
}) {
  const [activeTab, setActiveTab] = useState("general"); // "general" | "asiguratori" | "notificari" | "profil" | "diagnoza"

  // Form states
  const [capacitate, setCapacitate] = useState(capacitateZilnica || 3);
  const [prag, setPrag] = useState(pragRidicare || 3);
  const [inactivitateDays, setInactivitateDays] = useState(pragInactivitate || 7);
  const [tvaDefault, setTvaDefault] = useState(21);
  const [insurersList, setInsurersList] = useState(INSURERS);
  const [newInsurer, setNewInsurer] = useState("");
  const [visualPulseEnabled, setVisualPulseEnabled] = useState(true);
  const [compactCards, setCompactCards] = useState(false);
  const [saving, setSaving] = useState(false);

  // New user management states
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("operator"); // "operator" | "admin"
  const [newUserPassword, setNewUserPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  // Statistics
  const totalPoze = useMemo(() => claims.reduce((acc, c) => acc + (c.poze?.length || 0), 0), [claims]);
  const totalDocumente = useMemo(() => claims.reduce((acc, c) => acc + (c.documente?.length || 0), 0), [claims]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (capacitate !== capacitateZilnica) {
        await onSaveCapacitate(Number(capacitate));
      }
      if (prag !== pragRidicare) {
        await onSavePrag(Number(prag));
      }
      if (inactivitateDays !== pragInactivitate && onSavePragInactivitate) {
        await onSavePragInactivitate(Number(inactivitateDays));
      }
      onNotify("Setările și pragurile au fost salvate cu succes!", "success");
      onClose();
    } catch (err) {
      onNotify("Eroare la salvarea setărilor: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddInsurer = () => {
    const val = newInsurer.trim();
    if (!val) return;
    if (insurersList.includes(val)) {
      onNotify("Acest asigurător există deja în listă.", "error");
      return;
    }
    setInsurersList((prev) => [...prev, val].sort());
    setNewInsurer("");
    onNotify(`Asigurătorul „${val}" a fost adăugat.`, "success");
  };

  const handleRemoveInsurer = (name) => {
    setInsurersList((prev) => prev.filter((i) => i !== name));
    onNotify(`Asigurătorul „${name}" a fost eliminat.`, "info");
  };

  const exportFullBackupJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(claims, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup-workflow-dosare-${todayISO()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onNotify("Backup-ul JSON al dosarelor a fost descărcat.", "success");
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    const email = newUserEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      onNotify("Introdu o adresă de e-mail validă.", "error");
      return;
    }
    setCreatingUser(true);
    try {
      if (onAddUser) {
        await onAddUser({ email, role: newUserRole, password: newUserPassword });
      }
      setNewUserEmail("");
      setNewUserPassword("");
      onNotify(`Utilizatorul „${email}" a fost adăugat cu succes!`, "success");
    } catch (err) {
      onNotify("Eroare la adăugarea utilizatorului: " + err.message, "error");
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#FCFAF5] w-full max-w-4xl rounded-xl shadow-2xl border border-[#DAD4C6] flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header cu ecuson Utilizator */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1C2127] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C98A2B] to-[#A36C1D] flex items-center justify-center text-white font-bold text-[14px] shadow-sm">
              {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-[15.5px] tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Centrul de Administrare &amp; Setări
                </h2>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${isAdmin ? "bg-[#C98A2B]/20 text-[#F3D9A8] border border-[#C98A2B]/50" : "bg-white/10 text-white/80 border border-white/20"}`}>
                  {isAdmin ? "★ Administrator" : "Operator"}
                </span>
              </div>
              <p className="text-[11px] text-white/60">Conectat ca: <span className="text-white font-semibold">{userEmail || "Neautentificat"}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#DAD4C6] bg-[#FAF8F5] px-3 pt-2 gap-1 shrink-0 overflow-x-auto">
          {[
            { id: "general", label: "Parametri Generali", icon: Wrench },
            { id: "asiguratori", label: "Asigurători", icon: Building, badge: insurersList.length },
            { id: "notificari", label: "Afișare & Alerte", icon: Bell },
            { id: "profil", label: "Profil Utilizator", icon: User },
            { id: "diagnoza", label: "Diagnoză & Backup", icon: Database },
          ].map(({ id, label, icon: Icon, badge }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold border-b-2 transition-all whitespace-nowrap ${
                  active
                    ? "border-[#C98A2B] text-[#C98A2B] bg-white rounded-t-lg shadow-xs"
                    : "border-transparent text-[#6B6558] hover:text-[#23282E]"
                }`}
              >
                <Icon size={15} />
                <span>{label}</span>
                {badge !== undefined && (
                  <span className={`px-1.5 py-0.2 text-[10px] font-black rounded-full ${active ? "bg-[#C98A2B] text-white" : "bg-[#DAD4C6] text-[#23282E]"}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* TAB 1: PARAMETRI GENERALI & ATELIER */}
          {activeTab === "general" && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-[14px] text-[#23282E] border-b border-[#DAD4C6] pb-2 flex items-center gap-2">
                  <Wrench size={16} className="text-[#C98A2B]" /> Configurare Capacitate Atelier &amp; Praguri Alerte
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Prag mașini neridicate */}
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-2">
                    <label className="block text-[12.5px] font-bold text-[#23282E]">
                      Prag alertă mașini neridicate (zile)
                    </label>
                    <p className="text-[11px] text-[#8A8375]">
                      După câte zile de la finalizarea reparației se declanșează alerta pentru mașinile neridicate.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        className="w-24 p-2 border border-[#DAD4C6] rounded-lg font-bold text-[15px] bg-white text-center focus:border-[#C98A2B]"
                        value={prag}
                        onChange={(e) => setPrag(e.target.value)}
                      />
                      <span className="text-[12.5px] font-bold text-[#6B6558]">zile de la finalizare</span>
                    </div>
                  </div>

                  {/* NOUL PRAG: Alertă dosare fără activitate (inactivitate) */}
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-2">
                    <label className="block text-[12.5px] font-bold text-[#23282E] flex items-center gap-1.5">
                      <Clock size={15} className="text-[#C98A2B]" /> Prag alertă dosare fără activitate (inactivitate)
                    </label>
                    <p className="text-[11px] text-[#8A8375]">
                      Semnalează dosarele deschise în care NU a existat nicio modificare, schimbare de status sau notă nouă timp de X zile.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <select
                        className="p-2 border border-[#DAD4C6] rounded-lg font-bold text-[13.5px] bg-white focus:border-[#C98A2B]"
                        value={inactivitateDays}
                        onChange={(e) => setInactivitateDays(Number(e.target.value))}
                      >
                        <option value={3}>3 zile fără activitate</option>
                        <option value={5}>5 zile fără activitate</option>
                        <option value={7}>7 zile fără activitate (implicit)</option>
                        <option value={10}>10 zile fără activitate</option>
                        <option value={14}>14 zile (2 săptămâni)</option>
                        <option value={30}>30 zile (1 lună)</option>
                      </select>
                    </div>
                  </div>

                  {/* Capacitate zilnică programator */}
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-2">
                    <label className="block text-[12.5px] font-bold text-[#23282E]">
                      Capacitate maximă programări pe zi
                    </label>
                    <p className="text-[11px] text-[#8A8375]">
                      Limita de dosare ce pot fi programate într-o singură zi în calendarul service-ului.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        className="w-24 p-2 border border-[#DAD4C6] rounded-lg font-bold text-[15px] bg-white text-center focus:border-[#C98A2B]"
                        value={capacitate}
                        onChange={(e) => setCapacitate(e.target.value)}
                      />
                      <span className="text-[12.5px] font-bold text-[#6B6558]">mașini / zi</span>
                    </div>
                  </div>

                  {/* TVA Implicit */}
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-2">
                    <label className="block text-[12.5px] font-bold text-[#23282E]">
                      Cotă TVA implicită (%)
                    </label>
                    <p className="text-[11px] text-[#8A8375]">
                      Procentul de TVA aplicat automat la calculul veniturilor financiare și facturilor dosarului.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-24 p-2 border border-[#DAD4C6] rounded-lg font-bold text-[15px] bg-white text-center focus:border-[#C98A2B]"
                        value={tvaDefault}
                        onChange={(e) => setTvaDefault(e.target.value)}
                      />
                      <span className="text-[12.5px] font-bold text-[#6B6558]">% TVA</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-[#C98A2B] hover:bg-[#B37A22] text-white font-bold rounded-lg text-[13px] shadow-sm transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Salvează Parametrii
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: MANAGEMENT ASIGURĂTORI */}
          {activeTab === "asiguratori" && (
            <div className="space-y-4">
              <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#DAD4C6] pb-2">
                  <h3 className="font-bold text-[14px] text-[#23282E] flex items-center gap-2">
                    <Building size={16} className="text-[#C98A2B]" /> Nomenclator Asigurători ({insurersList.length})
                  </h3>
                  <span className="text-[11px] text-[#8A8375] font-semibold">Lista societăților de asigurare</span>
                </div>

                {/* Adăugare Asigurător Nou */}
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2 border border-[#DAD4C6] rounded-lg text-[13px] bg-[#FAF8F5] focus:bg-white"
                    placeholder="Adaugă societate de asigurare nouă (ex: SIGNAL IDUNA)..."
                    value={newInsurer}
                    onChange={(e) => setNewInsurer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddInsurer(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleAddInsurer}
                    className="flex items-center gap-1 px-4 py-2 bg-[#3B5166] text-white rounded-lg text-[12.5px] font-bold hover:bg-[#2C4160]"
                  >
                    <Plus size={15} /> Adaugă
                  </button>
                </div>

                {/* Grilă Asigurători */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                  {insurersList.map((ins) => (
                    <div key={ins} className="flex items-center justify-between bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg px-3 py-2 text-[12.5px]">
                      <span className="font-semibold text-[#23282E] truncate">{ins}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInsurer(ins)}
                        className="text-[#8A8375] hover:text-[#B23A2E] p-1 transition-colors"
                        title="Șterge din listă"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICĂRI & PREFERINȚE VIZUALE */}
          {activeTab === "notificari" && (
            <div className="space-y-4">
              <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-[14px] text-[#23282E] border-b border-[#DAD4C6] pb-2 flex items-center gap-2">
                  <Bell size={16} className="text-[#C98A2B]" /> Preferințe Notificări &amp; Vizualizare
                </h3>

                <div className="space-y-3">
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="block text-[13px] font-bold text-[#23282E]">Evidențiere pulsantă pentru alertele critice</span>
                      <span className="block text-[11px] text-[#8A8375]">Butoanele din antet vor lumina pulsatoriu când există întârzieri pe etapă</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={visualPulseEnabled}
                      onChange={(e) => setVisualPulseEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-[#C98A2B]"
                    />
                  </div>

                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="block text-[13px] font-bold text-[#23282E]">Mod afișare compact pe mobil</span>
                      <span className="block text-[11px] text-[#8A8375]">Reduce spațierea pe ecran pentru a afișa mai multe dosare simultan</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={compactCards}
                      onChange={(e) => setCompactCards(e.target.checked)}
                      className="w-4 h-4 rounded text-[#C98A2B]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROFIL UTILIZATOR & SECURITATE & GESTIONARE ECHIPĂ */}
          {activeTab === "profil" && (
            <div className="space-y-4">
              {/* Informații Cont Curent */}
              <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-[14px] text-[#23282E] border-b border-[#DAD4C6] pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User size={16} className="text-[#C98A2B]" /> Detalii Cont &amp; Securitate
                  </span>
                  <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${isAdmin ? "bg-[#C98A2B] text-white" : "bg-[#3B5166] text-white"}`}>
                    {isAdmin ? "Rol: ADMINISTRATOR (Acces Total)" : "Rol: OPERATOR (Dosare Proprii)"}
                  </span>
                </h3>

                <div className="space-y-3">
                  <div className="p-3.5 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-[#8A8375] font-bold uppercase block">Adresă de e-mail conectată</span>
                      <span className="font-mono font-bold text-[14px] text-[#23282E]">{userEmail || "—"}</span>
                      <span className="text-[11.5px] text-[#6B6558] block mt-0.5">
                        {isAdmin ? "🔑 Poți edita, modifica și șterge orice dosar din sistem." : "🔒 Poți edita și șterge doar dosarele create de tine."}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-[#3E6B45]/15 text-[#3E6B45] font-bold text-[11px] rounded-md">
                      ✓ Cont Activ
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-bold text-[#23282E]">Deconectare din cont</span>
                      <span className="text-[11px] text-[#8A8375] block">Închide sesiunea curentă în condiții de siguranță</span>
                    </div>
                    {onSignOut && (
                      <button
                        type="button"
                        onClick={onSignOut}
                        className="px-4 py-1.5 bg-[#B23A2E] text-white text-[12px] font-bold rounded-lg hover:bg-[#922D24] transition-colors"
                      >
                        Delogare
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTIUNE GESTIONARE UTILIZATORI (Disponibilă pentru Administrare) */}
              <div className="bg-white border border-[#C98A2B]/40 rounded-xl p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#DAD4C6] pb-2">
                  <div>
                    <h3 className="font-extrabold text-[14.5px] text-[#23282E] flex items-center gap-2">
                      <Shield size={17} className="text-[#C98A2B]" /> Administrare Utilizatori &amp; Permisiuni Echipa ({usersList.length})
                    </h3>
                    <p className="text-[11px] text-[#6B6558]">
                      Adaugă membri noi, oferă drepturi de Administrator sau elimină conturi din organizație
                    </p>
                  </div>
                  {!isAdmin && (
                    <span className="text-[10.5px] font-bold text-[#B23A2E] bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                      Doar Administratorii pot efectua modificări
                    </span>
                  )}
                </div>

                {/* Formular Adăugare Utilizator Nou */}
                <form onSubmit={handleAddUserSubmit} className="bg-[#FBF3E6] border border-[#C98A2B]/30 rounded-xl p-3.5 space-y-3">
                  <h4 className="font-bold text-[13px] text-[#7A5316] flex items-center gap-1.5">
                    <Plus size={15} /> Adaugă Utilizator Nou
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="email"
                      required
                      placeholder="E-mail utilizator (ex: coleg@service.ro)..."
                      className="p-2 border border-[#DAD4C6] rounded-lg text-[13px] bg-white font-medium focus:border-[#C98A2B]"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />

                    <select
                      className="p-2 border border-[#DAD4C6] rounded-lg text-[13px] bg-white font-bold text-[#23282E] focus:border-[#C98A2B]"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                    >
                      <option value="operator">Operator (Doar dosare proprii)</option>
                      <option value="admin">★ Administrator (Acces total)</option>
                    </select>

                    <input
                      type="password"
                      placeholder="Parolă inițială (opțional)..."
                      className="p-2 border border-[#DAD4C6] rounded-lg text-[13px] bg-white font-medium focus:border-[#C98A2B]"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={creatingUser}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#C98A2B] hover:bg-[#B37A22] text-white font-bold rounded-lg text-[12.5px] shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Plus size={15} /> {creatingUser ? "Se adaugă..." : "Adaugă Utilizator"}
                    </button>
                  </div>
                </form>

                {/* Lista Utilizatori Existenți */}
                <div className="space-y-2 pt-1">
                  <h4 className="font-bold text-[12.5px] text-[#23282E]">Membri Înregistrați ({usersList.length}):</h4>
                  {usersList.length === 0 ? (
                    <div className="p-4 text-center text-[12px] text-[#8A8375] bg-[#FAF8F5] rounded-xl border border-[#DAD4C6]">
                      Niciun utilizator suplimentar configurat încă.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#EFEAE1] border border-[#DAD4C6] rounded-xl overflow-hidden bg-white">
                      {usersList.map((u) => {
                        const isCurrent = u.email?.toLowerCase() === userEmail?.toLowerCase();
                        const isUserAdmin = u.role === "admin";

                        return (
                          <div key={u.email} className="p-3 flex items-center justify-between gap-2 hover:bg-[#FCFAF5]">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] text-white ${isUserAdmin ? "bg-[#C98A2B]" : "bg-[#3B5166]"}`}>
                                {u.email ? u.email.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-[13px] text-[#23282E]">{u.email}</span>
                                  {isCurrent && (
                                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-[#EFEAE1] text-[#3B5166]">
                                      Tu (Cont Curent)
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[#8A8375] block">
                                  Rol: <strong className={isUserAdmin ? "text-[#C98A2B]" : "text-[#3B5166]"}>{isUserAdmin ? "Administrator (Editare toate dosarele)" : "Operator (Editează doar propriile dosare)"}</strong>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Schimbare rol Admin / Operator */}
                              {onToggleAdminRole && (
                                <button
                                  type="button"
                                  onClick={() => onToggleAdminRole(u.email)}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold border transition-colors ${
                                    isUserAdmin
                                      ? "bg-[#EEF1F3] text-[#3B5166] border-[#DAD4C6] hover:bg-gray-200"
                                      : "bg-[#FBF3E6] text-[#7A5316] border-[#C98A2B]/40 hover:bg-[#F3D9A8]"
                                  }`}
                                  title={isUserAdmin ? "Retrogradează la Operator" : "Promovează în Administrator"}
                                >
                                  <Key size={13} />
                                  <span>{isUserAdmin ? "Devino Operator" : "★ Fă Administrator"}</span>
                                </button>
                              )}

                              {/* Ștergere utilizator */}
                              {onDeleteUser && (
                                <button
                                  type="button"
                                  disabled={isCurrent}
                                  onClick={() => onDeleteUser(u.email)}
                                  className="p-1.5 text-[#8A8375] hover:text-[#B23A2E] hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                  title={isCurrent ? "Nu te poți șterge pe tine însuți" : "Șterge utilizator"}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: DIAGNOZĂ & BACKUP DATA */}
          {activeTab === "diagnoza" && (
            <div className="space-y-4">
              <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-[14px] text-[#23282E] border-b border-[#DAD4C6] pb-2 flex items-center gap-2">
                  <Database size={16} className="text-[#3B5166]" /> Diagnostic Sistem &amp; Stocare Cloud
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl text-center">
                    <span className="text-[10px] font-bold uppercase text-[#8A8375]">Total Dosare</span>
                    <span className="block font-extrabold text-[20px] text-[#23282E]">{claims.length}</span>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl text-center">
                    <span className="text-[10px] font-bold uppercase text-[#8A8375]">Fotografii Salvate</span>
                    <span className="block font-extrabold text-[20px] text-[#C98A2B]">{totalPoze}</span>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl text-center">
                    <span className="text-[10px] font-bold uppercase text-[#8A8375]">Documente Atașate</span>
                    <span className="block font-extrabold text-[20px] text-[#3B5166]">{totalDocumente}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#DAD4C6]">
                  <h4 className="font-bold text-[13px] text-[#23282E] mb-1">Export &amp; Salvgardare Date (Backup)</h4>
                  <p className="text-[11px] text-[#8A8375] mb-3">
                    Descarcă o copie de siguranță completă a tuturor dosarelor și istoricului din aplicație în format JSON.
                  </p>
                  <button
                    type="button"
                    onClick={exportFullBackupJSON}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#2C4160] text-white text-[12.5px] font-bold rounded-lg hover:bg-[#1E2D44] transition-colors"
                  >
                    <Download size={15} /> Descarcă Backup Complet (.json)
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-[#DAD4C6] shrink-0 text-[12px]">
          <span className="text-[#8A8375]">Workflow Dosare Daună v1.4</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#C7C0B0] font-semibold text-[#4A443A] hover:bg-[#EFEAE1]"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}
