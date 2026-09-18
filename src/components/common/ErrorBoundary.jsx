import React from "react";
import { AlertOctagon, RotateCcw, WifiOff, Home, FileQuestion } from "lucide-react";
import { telemetry } from "../../utils/telemetry";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isAutoRetrying: false,
      autoRetriedOnce: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Trimitere către telemetrie
    telemetry.logError(error, { componentStack: errorInfo?.componentStack });

    // Auto-Healing: dacă este prima eroare pe modul, încearcă o rerandare automată după 150ms
    if (!this.state.autoRetriedOnce && !this.isNetworkOrChunkError(error)) {
      this.setState({ isAutoRetrying: true, autoRetriedOnce: true });
      this.autoRetryTimer = setTimeout(() => {
        this.handleAutoRetry();
      }, 150);
    }
  }

  componentWillUnmount() {
    if (this.autoRetryTimer) {
      clearTimeout(this.autoRetryTimer);
    }
  }

  isNetworkOrChunkError(error) {
    const msg = String(error?.message || "");
    return (
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      msg.includes("dynamically imported module") ||
      msg.includes("Failed to fetch") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("NetworkError")
    );
  }

  handleAutoRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isAutoRetrying: false,
    });
  };

  resetErrorState = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isAutoRetrying: false,
    });
    this.props.onReset?.();
  };

  handleHardReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    const { hasError, error, isAutoRetrying } = this.state;
    const { children, level = "module", fallbackTitle, onGoHome, onClose } = this.props;

    if (!hasError) {
      return children;
    }

    if (isAutoRetrying) {
      return (
        <div className="flex items-center justify-center p-6 text-[12.5px] font-bold text-[var(--app-muted)] animate-pulse">
          Se reîncearcă afișarea automată...
        </div>
      );
    }

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    const isChunk = this.isNetworkOrChunkError(error);
    const isRoot = level === "root";

    return (
      <div
        className={`flex items-center justify-center p-4 ${
          isRoot ? "fixed inset-0 z-[99999] bg-[var(--app-bg)]" : "w-full py-8"
        }`}
      >
        <div className="bg-[var(--app-surface)] rounded-2xl border-2 border-[var(--app-border)] p-6 max-w-md w-full shadow-2xl text-center space-y-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              isOffline
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                : "bg-[var(--app-danger)]/10 text-[var(--app-danger)] border border-[var(--app-danger)]/20"
            }`}
          >
            {isOffline ? <WifiOff size={24} /> : isChunk ? <FileQuestion size={24} /> : <AlertOctagon size={24} />}
          </div>

          <div>
            <h2 className="font-extrabold text-[16px] text-[var(--app-text-strong)]">
              {fallbackTitle || (isOffline ? "Conexiune Întreruptă" : isChunk ? "Actualizare Disponibilă" : "Eroare Temporară de Afișare")}
            </h2>
            <p className="text-[12px] text-[var(--app-muted)] mt-1 font-medium leading-relaxed">
              {isOffline
                ? "Aplicația nu poate descărca datele fără o conexiune activă la internet."
                : isChunk
                ? "A fost lansată o versiune nouă a modulului. Reîncărcarea paginii va descărca cele mai recente fișiere."
                : "A apărut o excepție neașteptată în acest modul. Restul aplicației rămâne operațională."}
            </p>
          </div>

          {error?.message && !isOffline && (
            <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] p-2.5 rounded-xl text-left">
              <span className="font-mono text-[11px] text-[var(--app-danger)] break-all font-semibold block">
                {error.message}
              </span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            {isChunk ? (
              <button
                type="button"
                onClick={this.handleHardReload}
                className="px-4 py-2.5 bg-[var(--app-accent)] text-[var(--app-accent-text)] text-[12.5px] font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <RotateCcw size={14} /> Reîncarcă Aplicația
              </button>
            ) : (
              <button
                type="button"
                onClick={this.resetErrorState}
                className="px-4 py-2.5 bg-[var(--app-accent)] text-[var(--app-accent-text)] text-[12.5px] font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <RotateCcw size={14} /> Reîncearcă
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2.5 bg-[var(--app-surface-2)] hover:bg-[var(--app-border)] text-[var(--app-text-strong)] text-[12.5px] font-bold rounded-xl transition-all flex items-center gap-1.5 border border-[var(--app-border)] cursor-pointer"
              >
                Închide
              </button>
            )}

            {onGoHome && (
              <button
                type="button"
                onClick={() => {
                  this.resetErrorState();
                  onGoHome();
                }}
                className="px-3.5 py-2.5 bg-[var(--app-surface-2)] hover:bg-[var(--app-border)] text-[var(--app-text-strong)] text-[12.5px] font-bold rounded-xl transition-all flex items-center gap-1.5 border border-[var(--app-border)] cursor-pointer"
              >
                <Home size={14} /> Acasă
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
