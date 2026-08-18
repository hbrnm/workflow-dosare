// Utilitare categorie scan.

export const PHOTO_CATEGORIES = [
  { key: "receptie", label: "Recepție", color: "bg-[#C98A2B]" },
  { key: "reconstatare", label: "Reconstatare", color: "bg-[#3B5166]" },
  { key: "predare", label: "Predare", color: "bg-[#3E6B45]" },
];

const PHOTO_FOLDER_KEYS = new Set(PHOTO_CATEGORIES.map((c) => c.key));

export function isPhotoFolderKey(key) {
  return PHOTO_FOLDER_KEYS.has(String(key || ""));
}

/**
 * Într-o sesiune live: prima poză cere folder; următoarele reiau folderul ales.
 * Scanul de documente nu cere folder.
 */
export function resolveSessionPhotoFolder({
  isScan = false,
  sessionFolder = null,
  fallback = null,
} = {}) {
  if (isScan) {
    return { ask: false, folder: fallback || sessionFolder || null };
  }
  if (isPhotoFolderKey(sessionFolder)) {
    return { ask: false, folder: sessionFolder };
  }
  return { ask: true, folder: null };
}

export function categoryLabel(categoria) {
  if (categoria === "receptie") return "RECEPȚIE";
  if (categoria === "reconstatare") return "RECONST.";
  if (categoria === "predare") return "PREDARE";
  if (categoria === "generale") return "GENERAL";
  return null;
}
