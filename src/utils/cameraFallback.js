const CAMERA_DENIED_KEY = "workflow_dosare_live_camera_denied";

export function markLiveCameraDenied() {
  try {
    sessionStorage.setItem(CAMERA_DENIED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isLiveCameraDenied() {
  try {
    return sessionStorage.getItem(CAMERA_DENIED_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearLiveCameraDenied() {
  try {
    sessionStorage.removeItem(CAMERA_DENIED_KEY);
  } catch {
    /* ignore */
  }
}

export function isCameraPermissionDeniedError(err) {
  const name = String(err?.name || "");
  return name === "NotAllowedError" || name === "PermissionDeniedError";
}
