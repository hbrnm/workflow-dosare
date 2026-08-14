import React, { useState } from "react";
import { ROLE_OPTIONS, normalizeRole } from "../../constants/roles";

/** Admin: listă utilizatori în setari.utilizatori */
export default function UsersAdmin({ usersList = [], adminEmails = [], onSave, saving }) {
  const [rows, setRows] = useState(() =>
    (usersList || []).map((u) => ({
      email: u.email || "",
      role: normalizeRole(u.role || "receptioner"),
    }))
  );
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("receptioner");

  const add = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (rows.some((r) => r.email === email)) return;
    setRows((prev) => [...prev, { email, role: newRole }]);
    setNewEmail("");
  };

  const remove = (email) => setRows((prev) => prev.filter((r) => r.email !== email));

  const save = () => {
    const utilizatori = rows.map((r) => ({
      email: r.email.trim().toLowerCase(),
      role: normalizeRole(r.role),
    }));
    const admins = utilizatori.filter((u) => u.role === "admin").map((u) => u.email);
    // păstrează admin_emails existente care nu sunt în listă
    const mergedAdmins = Array.from(new Set([...(adminEmails || []).map((e) => String(e).toLowerCase()), ...admins]));
    onSave?.({ utilizatori, adminEmails: mergedAdmins });
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
      <div>
        <h1 className="font-[family-name:var(--v2-font-display)] text-xl font-bold text-[var(--v2-text)]">
          Utilizatori & roluri
        </h1>
        <p className="text-sm text-[var(--v2-muted)]">
          Recepționer creează dosare; mecanic actualizează progres și poze; admin are acces complet.
        </p>
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.email}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--v2-text)]">
              {r.email}
            </span>
            <select
              className="v2-input !w-auto py-1 text-xs"
              value={r.role}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((x) => (x.email === r.email ? { ...x, role: e.target.value } : x))
                )
              }
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button type="button" className="text-xs text-[var(--v2-danger)]" onClick={() => remove(r.email)}>
              Șterge
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[var(--v2-border)] p-3 sm:flex-row">
        <input
          className="v2-input flex-1"
          placeholder="email@atelier.ro"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <select className="v2-input !w-auto" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button type="button" className="v2-btn-secondary" onClick={add}>
          Adaugă
        </button>
      </div>

      <p className="text-xs text-[var(--v2-muted)]">
        Conturile se creează în Supabase Auth. Aici setezi doar rolul pe email.
      </p>

      <button type="button" className="v2-btn-primary w-full" disabled={saving} onClick={save}>
        {saving ? "Salvez…" : "Salvează rolurile"}
      </button>
    </div>
  );
}
