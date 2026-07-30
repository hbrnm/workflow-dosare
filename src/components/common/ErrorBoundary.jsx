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
          <div className="bg-white rounded-xl border border-[#B23A2E] p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#B23A2E]/10 text-[#B23A2E] flex items-center justify-center mx-auto">
              <AlertOctagon size={24} />
            </div>
            <div className="font-bold text-[16px] text-[#23282E]">Eroare de afișare</div>
            <p className="text-[12.5px] text-[#6B6558]">
              A apărut o problemă temporară la încărcarea acestei ferestre:
              <br />
              <span className="font-mono text-[11px] text-[#B23A2E] bg-[#FFF2F0] px-2 py-1 rounded inline-block mt-2 break-all">
                {this.state.error?.message || "Eroare necunoscută"}
              </span>
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
              }}
              className="px-4 py-2 bg-[#3B5166] text-white text-[13px] font-semibold rounded-lg hover:bg-[#2C3E4C] transition-colors inline-flex items-center gap-1.5"
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
