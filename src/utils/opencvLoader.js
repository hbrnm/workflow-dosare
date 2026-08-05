/**
 * Lazy-load OpenCV.js once — only when the user opens the document scanner.
 * Do NOT prefetch at login: parsing ~9MB on the main thread freezes the PWA.
 */

const OPENCV_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/jscanify@1.4.3/src/opencv.js";

let loadPromise = null;

export function isOpenCvReady() {
  return Boolean(typeof window !== "undefined" && window.cv && typeof window.cv.Mat === "function");
}

export function getOpenCv() {
  return isOpenCvReady() ? window.cv : null;
}

/**
 * Loads OpenCV.js from CDN (or resolves immediately if already ready).
 * Call only from Scan Acte / crop flows — never on app boot.
 * @returns {Promise<typeof window.cv>}
 */
export function loadOpenCv() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("OpenCV requires a browser environment"));
  }
  if (isOpenCvReady()) return Promise.resolve(window.cv);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    let settled = false;
    const finishOk = () => {
      if (settled) return;
      if (isOpenCvReady()) {
        settled = true;
        resolve(window.cv);
      } else {
        settled = true;
        loadPromise = null;
        reject(new Error("OpenCV loaded but cv.Mat is unavailable"));
      }
    };
    const finishErr = (err) => {
      if (settled) return;
      settled = true;
      loadPromise = null;
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    const attachRuntimeHook = () => {
      if (!window.cv) {
        finishErr(new Error("OpenCV script loaded without global cv"));
        return;
      }
      if (typeof window.cv.Mat === "function") {
        finishOk();
        return;
      }
      const prev = window.cv.onRuntimeInitialized;
      window.cv.onRuntimeInitialized = () => {
        try {
          if (typeof prev === "function") prev();
        } catch {
          /* ignore previous hook errors */
        }
        // Yield so the huge init work doesn't stack with React paint
        window.setTimeout(finishOk, 0);
      };
    };

    // Already injected by a previous attempt / script tag
    if (window.cv) {
      attachRuntimeHook();
      return;
    }

    const existing = document.querySelector(`script[data-opencv="1"]`);
    if (existing) {
      existing.addEventListener("load", attachRuntimeHook);
      existing.addEventListener("error", () => finishErr(new Error("Nu am putut încărca OpenCV.js")));
      // If script already finished loading before listeners attached
      if (existing.dataset.loaded === "1") attachRuntimeHook();
      return;
    }

    const script = document.createElement("script");
    script.src = OPENCV_SCRIPT_URL;
    script.async = true;
    script.dataset.opencv = "1";
    script.onload = () => {
      script.dataset.loaded = "1";
      // Defer parse/init handoff off the current call stack
      window.setTimeout(attachRuntimeHook, 0);
    };
    script.onerror = () => finishErr(new Error("Nu am putut încărca motorul OpenCV (rețea / CDN)."));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Optional idle warm-up — safe to call, but never from login/boot critical path.
 * Uses requestIdleCallback so it won't freeze the UI.
 */
export function prefetchScanEngine() {
  if (typeof window === "undefined" || isOpenCvReady() || loadPromise) {
    return Promise.resolve(getOpenCv());
  }
  return new Promise((resolve) => {
    const run = () => {
      loadOpenCv()
        .then(resolve)
        .catch((err) => {
          console.warn("OpenCV idle prefetch failed:", err);
          resolve(null);
        });
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => window.setTimeout(run, 1500), { timeout: 8000 });
    } else {
      window.setTimeout(run, 4000);
    }
  });
}

export function getOpenCvScriptUrl() {
  return OPENCV_SCRIPT_URL;
}
