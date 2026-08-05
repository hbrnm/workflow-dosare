/**
 * Lazy-load OpenCV.js (WASM/asm) once — needed for real document edge detection.
 * Cached by the browser / PWA workbox after first download (~8–9 MB).
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
 * @returns {Promise<typeof window.cv>}
 */
export function loadOpenCv() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("OpenCV requires a browser environment"));
  }
  if (isOpenCvReady()) return Promise.resolve(window.cv);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (isOpenCvReady()) resolve(window.cv);
      else reject(new Error("OpenCV loaded but cv.Mat is unavailable"));
    };

    // Already injected by a previous attempt / script tag
    if (window.cv) {
      if (typeof window.cv.Mat === "function") {
        finish();
        return;
      }
      window.cv.onRuntimeInitialized = finish;
      return;
    }

    const existing = document.querySelector(`script[data-opencv="1"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (isOpenCvReady()) finish();
        else if (window.cv) window.cv.onRuntimeInitialized = finish;
      });
      existing.addEventListener("error", () => {
        loadPromise = null;
        reject(new Error("Nu am putut încărca OpenCV.js"));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = OPENCV_SCRIPT_URL;
    script.async = true;
    script.dataset.opencv = "1";
    script.onload = () => {
      try {
        if (isOpenCvReady()) {
          finish();
        } else if (window.cv) {
          window.cv.onRuntimeInitialized = finish;
        } else {
          loadPromise = null;
          reject(new Error("OpenCV script loaded without global cv"));
        }
      } catch (err) {
        loadPromise = null;
        reject(err);
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Nu am putut încărca motorul OpenCV (rețea / CDN)."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function getOpenCvScriptUrl() {
  return OPENCV_SCRIPT_URL;
}
