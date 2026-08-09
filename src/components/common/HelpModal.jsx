import React, { useState, useEffect } from "react";
import { X, CircleHelp, ChevronLeft, BookOpen } from "lucide-react";
import { HELP_ARTICLES, getHelpArticle } from "../../constants/helpArticles";
import AppButton from "./AppButton";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
  modalHeaderClass,
} from "./modalShellClasses";

/**
 * In-app help — article list + detail.
 * initialArticleId opens a specific article (e.g. from onboarding).
 */
export default function HelpModal({
  open,
  onClose,
  initialArticleId = null,
  desktopUi = false,
}) {
  const [articleId, setArticleId] = useState(null);

  useEffect(() => {
    if (!open) {
      setArticleId(null);
      return;
    }
    setArticleId(initialArticleId || null);
  }, [open, initialArticleId]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const article = articleId ? getHelpArticle(articleId) : null;

  return (
    <div
      className={modalOverlayClass(desktopUi, { dense: true })}
      {...modalOverlayProps(desktopUi)}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={modalPanelClass(
          desktopUi,
          "w-full max-w-lg overflow-hidden flex flex-col max-h-[min(88vh,640px)]"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
      >
        <div
          className={modalHeaderClass(
            desktopUi,
            "px-4 py-3 flex items-center justify-between gap-3 shrink-0"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {article ? (
              <AppButton
                variant="icon"
                onClick={() => setArticleId(null)}
                aria-label="Înapoi la lista de articole"
                title="Înapoi"
              >
                <ChevronLeft size={18} />
              </AppButton>
            ) : (
              <CircleHelp size={18} className="text-[var(--app-muted)] shrink-0" aria-hidden />
            )}
            <h2
              id="help-title"
              className="font-semibold text-[15px] text-[var(--app-text-strong)] truncate"
            >
              {article ? article.title : "Ajutor"}
            </h2>
          </div>
          <AppButton variant="icon" onClick={onClose} aria-label="Închide ajutorul" title="Închide">
            <X size={18} />
          </AppButton>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {article ? (
            <article className="space-y-3">
              <p className="text-[12.5px] text-[var(--app-muted)] leading-relaxed">
                {article.summary}
              </p>
              <ol className="space-y-2.5 list-decimal pl-5 text-[13px] text-[var(--app-text)] leading-relaxed">
                {article.body.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </article>
          ) : (
            <ul className="space-y-2" role="list">
              {HELP_ARTICLES.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setArticleId(a.id)}
                    className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-2)] transition-colors app-focusable"
                  >
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[var(--app-surface-muted)] text-[var(--app-text)]">
                      <BookOpen size={16} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-[13px] text-[var(--app-text-strong)]">
                        {a.title}
                      </span>
                      <span className="block text-[12px] text-[var(--app-muted)] mt-0.5 leading-relaxed">
                        {a.summary}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
