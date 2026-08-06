/**
 * Lazy-load OpenCV.js — only when opening the document scanner.
 * Never call from login/boot (parses ~9MB and can freeze the UI).
 *
 * Emscripten needs Module.onRuntimeInitialized BEFORE the script runs.
 * We also poll + timeout so the UI never hangs on “Se încarcă…”.
 */

const OPENCV_CANDIDATE_URLS = [
  "https://cdn.jsdelivr.net/npm/jscanify@1.4.3/src/opencv.js",
  "https://docs.opencv.org/4.7.0/opencv.js",
];

const DEFAULT_TIMEOUT_MS = 15000;

let loadPromise = null;

export function isOpenCvReady() {
  try {
    return Boolean(
      typeof window !== "undefined" &&
        window.cv &&
        typeof window.cv.Mat === "function" &&
        typeof window.cv.imread === "function"
    );
  } catch {
    return false;
  }
}

export function getOpenCv() {
  return isOpenCvReady() ? window.cv : null;
}

function installRuntimeHooks(notify) {
  if (typeof window === "undefined") return;

  if (!window.Module || typeof window.Module !== "object") {
    window.Module = {};
  }

  const wrap = (obj) => {
    if (!obj || typeof obj !== "object") return;
    const prev = obj.onRuntimeInitialized;
    if (obj.__dosareOpenCvHooked) return;
    obj.__dosareOpenCvHooked = true;
    obj.onRuntimeInitialized = function onRuntimeInitialized() {
      try {
        if (typeof prev === "function") prev.apply(this, arguments);
      } catch {
        /* ignore */
      }
      window.setTimeout(notify, 0);
    };
  };

  wrap(window.Module);
  if (window.cv) wrap(window.cv);
}

function pollUntilReady(timeoutMs) {
  return new Promise((resolve, reject) => {
    if (isOpenCvReady()) {
      resolve(window.cv);
      return;
    }

    let settled = false;
    const finish = (ok, err) => {
      if (settled) return;
      settled = true;
      window.clearInterval(pollId);
      window.clearTimeout(timerId);
      if (ok) resolve(window.cv);
      else reject(err || new Error("OpenCV init timeout"));
    };

    const notify = () => {
      if (isOpenCvReady()) finish(true);
    };

    installRuntimeHooks(notify);

    const pollId = window.setInterval(notify, 150);
    const timerId = window.setTimeout(() => {
      finish(false, new Error(`OpenCV nu a răspuns în ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);

    // In case it became ready between checks
    notify();
  });
}

function injectScript(url) {
  return new Promise((resolve, reject) => {
    // Reuse same-URL script if already present
    const existing = document.querySelector(`script[data-opencv="1"][data-opencv-url="${url}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") {
        resolve(existing);
        return;
      }
      existing.addEventListener("load", () => resolve(existing), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Eroare rețea OpenCV: ${url}`)), {
        once: true,
      });
      return;
    }

    // Drop other failed/partial OpenCV scripts
    document.querySelectorAll("script[data-opencv='1']").forEach((el) => {
      if (el.dataset.opencvUrl !== url) el.remove();
    });

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.dataset.opencv = "1";
    script.dataset.opencvUrl = url;
    script.onload = () => {
      script.dataset.loaded = "1";
      // cv global may already exist; re-hook it
      if (window.cv && !window.cv.__dosareOpenCvHooked) {
        installRuntimeHooks(() => {});
      }
      resolve(script);
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Nu am putut descărca OpenCV (${url})`));
    };
    document.head.appendChild(script);
  });
}

/**
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<typeof window.cv>}
 */
export function loadOpenCv(options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (typeof window === "undefined") {
    return Promise.reject(new Error("OpenCV requires a browser environment"));
  }
  if (isOpenCvReady()) return Promise.resolve(window.cv);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // MUST install Module hook before first script evaluation
    installRuntimeHooks(() => {});

    let lastError = null;
    for (const url of OPENCV_CANDIDATE_URLS) {
      try {
        await injectScript(url);
        const cv = await pollUntilReady(timeoutMs);
        return cv;
      } catch (err) {
        lastError = err;
        console.warn("OpenCV load attempt failed:", url, err);
        document.querySelectorAll("script[data-opencv='1']").forEach((el) => el.remove());
        // Allow a fresh Module hook for the next CDN
        try {
          if (window.Module) delete window.Module.__dosareOpenCvHooked;
          if (window.cv) delete window.cv.__dosareOpenCvHooked;
        } catch {
          /* ignore */
        }
      }
    }
    throw lastError || new Error("OpenCV indisponibil");
  })();

  loadPromise = loadPromise.then(
    (cv) => cv,
    (err) => {
      loadPromise = null;
      throw err;
    }
  );

  return loadPromise;
}

export function prefetchScanEngine() {
  if (typeof window === "undefined" || isOpenCvReady() || loadPromise) {
    return Promise.resolve(getOpenCv());
  }
  return new Promise((resolve) => {
    const run = () => {
      loadOpenCv({ timeoutMs: 20000 })
        .then(resolve)
        .catch((err) => {
          console.warn("OpenCV idle prefetch failed:", err);
          resolve(null);
        });
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => window.setTimeout(run, 2000), { timeout: 10000 });
    } else {
      window.setTimeout(run, 5000);
    }
  });
}

export function getOpenCvScriptUrl() {
  return OPENCV_CANDIDATE_URLS[0];
}
