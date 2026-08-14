/**
 * Serviciu de Telemetrie & Interceptare Globală a Erorilor.
 * Interceptează window.onerror, unhandledrejection, sanitizează datele PII (tokeni, parole, CNP),
 * limitează rata de logare (storm prevention) și păstrează istoricul acțiunilor (breadcrumbs).
 */

class TelemetryService {
  constructor() {
    this.breadcrumbs = [];
    this.MAX_BREADCRUMBS = 20;
    this.errorLogCounts = new Map();
    this.RATE_LIMIT_WINDOW_MS = 10000;
    this.MAX_SAME_ERRORS_PER_WINDOW = 4;
    this.initialized = false;
  }

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    // 1. Interceptare Unhandled JS Errors
    window.onerror = (message, source, lineno, colno, error) => {
      this.logError(error || new Error(String(message)), { source, lineno, colno });
      return false;
    };

    // 2. Interceptare Unhandled Promise Rejections
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      this.logError(
        reason instanceof Error ? reason : new Error(`Unhandled Promise: ${String(reason)}`),
        { isPromiseRejection: true }
      );
    });

    // 3. Monitorizare Clicuri pentru Breadcrumbs
    document.addEventListener(
      "click",
      (e) => {
        const target = e.target;
        if (!target) return;
        const btn = target.closest("button, a, input[type='button'], input[type='submit']");
        if (btn) {
          const text = (btn.textContent || btn.value || "").trim().slice(0, 30);
          this.addBreadcrumb("ui.click", `Click: ${btn.tagName} [${text}]`);
        }
      },
      { passive: true }
    );
  }

  addBreadcrumb(category, message, data) {
    const sanitizedData = data ? this.sanitizeObject(data) : undefined;
    this.breadcrumbs.push({
      timestamp: new Date().toISOString(),
      category: category || "general",
      message: this.sanitizeString(message || ""),
      data: sanitizedData,
    });

    if (this.breadcrumbs.length > this.MAX_BREADCRUMBS) {
      this.breadcrumbs.shift();
    }
  }

  logError(error, context) {
    const errorKey = `${error?.name || "Error"}:${error?.message || "Unknown"}`;
    const now = Date.now();

    // Rate Limiting Storm Prevention
    const existing = this.errorLogCounts.get(errorKey);
    if (existing && now - existing.firstSeen < this.RATE_LIMIT_WINDOW_MS) {
      if (existing.count >= this.MAX_SAME_ERRORS_PER_WINDOW) {
        return null;
      }
      existing.count += 1;
    } else {
      this.errorLogCounts.set(errorKey, { count: 1, firstSeen: now });
    }

    const payload = {
      name: error?.name || "UncaughtError",
      message: this.sanitizeString(error?.message || String(error)),
      stack: error?.stack ? this.sanitizeString(error.stack) : undefined,
      url: typeof window !== "undefined" ? window.location.href : "",
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      context: context ? this.sanitizeObject(context) : undefined,
      breadcrumbs: [...this.breadcrumbs],
      timestamp: new Date().toISOString(),
    };

    console.error("[Telemetry] Intercepted Error:", payload);
    return payload;
  }

  sanitizeString(str) {
    if (typeof str !== "string") return String(str || "");
    return str
      .replace(/Bearer\s+[A-Za-z0-9-_=.]+/gi, "Bearer [REDACTED_TOKEN]")
      .replace(/key=[A-Za-z0-9-_]+/gi, "key=[REDACTED_KEY]")
      .replace(/password[:=]\s*["']?[^"'\s]+/gi, "password=[REDACTED_PASSWORD]")
      .replace(/\b\d{13}\b/g, "[REDACTED_CNP]")
      .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, "[REDACTED_EMAIL]");
  }

  sanitizeObject(obj) {
    try {
      const copy = JSON.parse(JSON.stringify(obj));
      const sanitizeKeys = (target) => {
        if (!target || typeof target !== "object") return;
        for (const k of Object.keys(target)) {
          if (/token|auth|key|secret|password|bearer|authorization/i.test(k)) {
            target[k] = "[REDACTED]";
          } else if (typeof target[k] === "string") {
            target[k] = this.sanitizeString(target[k]);
          } else if (typeof target[k] === "object") {
            sanitizeKeys(target[k]);
          }
        }
      };
      sanitizeKeys(copy);
      return copy;
    } catch {
      return { note: "Unserializable context" };
    }
  }
}

export const telemetry = new TelemetryService();
telemetry.init();
