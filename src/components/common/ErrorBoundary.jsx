import React from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--app-surface)] rounded-xl border border-[var(--app-danger)] p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[var(--app-danger)]/10 text-[var(--app-danger)] flex items-center justify-center mx-auto">
              <AlertOctagon size={24} />
            </div>
            <div className="font-bold text-[16px] text-[var(--app-text-strong)]">Eroare de afișare</div>
            <p className="text-[12.5px] text-[var(--app-muted)]">
              A apărut o problemă temporară la încărcarea acestei ferestre:
              <br />
              <span className="font-mono text-[11px] text-[var(--app-danger)] bg-[var(--app-danger)]/15 px-2 py-1 rounded inline-block mt-2 break-all">
                {this.state.error?.message || "Eroare necunoscută"}
              </span>
            </p>
            <button
              onClick={() => {
                const msg = this.state.error?.message || "";
                const isChunkError =
                  msg.includes("dynamically imported module") ||
                  msg.includes("Failed to fetch") ||
                  msg.includes("Importing a module script failed");

                if (isChunkError) {
                  window.location.reload();
                } else {
                  this.setState({ hasError: false, error: null });
                  if (this.props.onReset) this.props.onReset();
                }
              }}
              className="px-4 py-2 bg-[var(--app-surface-muted)] text-[var(--app-text-strong)] text-[13px] font-semibold rounded-lg hover:bg-[var(--app-border)] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <RotateCcw size={14} /> Reîncearcă
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
