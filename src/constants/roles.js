/** Roluri Workflow Daune 2.0 (MVP Faza 1). `operator` = alias legacy pentru receptioner. */

export const ROLES = {
  admin: {
    key: "admin",
    label: "Administrator",
    description: "Acces complet, utilizatori, toate dosarele",
  },
  receptioner: {
    key: "receptioner",
    label: "Recepționer / Consilier daune",
    description: "Recepție, inspecție, documente, statusuri",
  },
  inspector: {
    key: "inspector",
    label: "Inspector / Constatator Daune",
    description: "Constatare avarii, poze repere, note constatare",
  },
  contabil: {
    key: "contabil",
    label: "Contabil / Ofițer Financiar",
    description: "Devize, facturare, decont, accepturi plată",
  },
  mecanic: {
    key: "mecanic",
    label: "Mecanic / Tinichigiu / Vopsitor",
    description: "Lucrări alocate, progres, poze reparație",
  },
  operator: {
    key: "operator",
    label: "Operator (legacy)",
    description: "Compatibilitate v1 — tratat ca recepționer",
  },
};

export const ROLE_OPTIONS = [
  { value: "receptioner", label: ROLES.receptioner.label },
  { value: "inspector", label: ROLES.inspector.label },
  { value: "contabil", label: ROLES.contabil.label },
  { value: "mecanic", label: ROLES.mecanic.label },
  { value: "admin", label: ROLES.admin.label },
];

export function normalizeRole(role) {
  const r = String(role || "").toLowerCase().trim();
  if (r === "admin") return "admin";
  if (r === "inspector" || r === "constatator" || r === "lichidator") return "inspector";
  if (r === "contabil" || r === "financiar" || r === "facturare") return "contabil";
  if (r === "mecanic" || r === "tinichigiu" || r === "vopsitor") return "mecanic";
  if (r === "receptioner" || r === "receptionist" || r === "operator" || r === "consilier") {
    return "receptioner";
  }
  return "receptioner";
}

export function resolveUserRole(email, { adminEmails = [], usersList = [] } = {}) {
  const clean = String(email || "").toLowerCase().trim();
  if (!clean) return "receptioner";

  const fromList = (usersList || []).find(
    (u) => String(u?.email || "").toLowerCase().trim() === clean
  );
  if (fromList?.role) return normalizeRole(fromList.role);

  if ((adminEmails || []).some((e) => String(e).toLowerCase().trim() === clean)) {
    return "admin";
  }

  // Bootstrap: fără utilizatori configurați, primul cont e admin
  if ((!usersList || usersList.length === 0) && (!adminEmails || adminEmails.length === 0)) {
    return "admin";
  }

  return "receptioner";
}

export function canCreateClaim(role) {
  const r = normalizeRole(role);
  return r === "admin" || r === "receptioner" || r === "inspector";
}

export function canInspectVehicle(role) {
  const r = normalizeRole(role);
  return r === "admin" || r === "receptioner" || r === "inspector";
}

export function canEditFinancials(role) {
  const r = normalizeRole(role);
  return r === "admin" || r === "receptioner" || r === "contabil";
}

export function canEditClaimFull(role, claim, userId, userEmail) {
  const r = normalizeRole(role);
  if (r === "admin" || r === "receptioner" || r === "inspector" || r === "contabil") return true;
  if (r === "mecanic") return false;
  // fallback ownership
  if (!claim) return false;
  if (claim.createdBy && userId && claim.createdBy === userId) return true;
  if (
    claim.createdByEmail &&
    userEmail &&
    String(claim.createdByEmail).toLowerCase() === String(userEmail).toLowerCase()
  ) {
    return true;
  }
  return !claim.createdBy && !claim.createdByEmail;
}

export function canEditWorkshop(role) {
  const r = normalizeRole(role);
  return r === "admin" || r === "receptioner" || r === "mecanic" || r === "inspector";
}

export function canChangeStatus(role) {
  const r = normalizeRole(role);
  return r === "admin" || r === "receptioner" || r === "mecanic" || r === "inspector";
}

export function canManageUsers(role) {
  return normalizeRole(role) === "admin";
}

export function canDeleteClaim(role, claim, userId, userEmail) {
  if (normalizeRole(role) === "admin") return true;
  if (normalizeRole(role) !== "receptioner") return false;
  if (!claim) return false;
  if (claim.createdBy && userId && claim.createdBy === userId) return true;
  if (
    claim.createdByEmail &&
    userEmail &&
    String(claim.createdByEmail).toLowerCase() === String(userEmail).toLowerCase()
  ) {
    return true;
  }
  return false;
}
