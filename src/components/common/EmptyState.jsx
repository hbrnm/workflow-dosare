import React from "react";
import AppButton from "./AppButton";

/**
 * Standardized empty state presentation component.
 * Displays an icon, a clear title, an optional descriptive message,
 * and an optional primary or secondary action button.
 */
export default function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  actionVariant = "primary",
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
  compact = false,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center select-none rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface-2)]/40 transition-all ${
        compact ? "p-4 sm:p-6" : "p-6 sm:p-10"
      } ${className}`.trim()}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center text-[var(--app-muted)] mb-3 shadow-xs">
          <Icon size={22} className="opacity-80" />
        </div>
      )}

      {title && (
        <h4 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--app-text-strong)] tracking-tight">
          {title}
        </h4>
      )}

      {message && (
        <p className="text-[12px] text-[var(--app-muted)] max-w-sm mt-1 leading-relaxed font-normal">
          {message}
        </p>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {secondaryActionLabel && onSecondaryAction && (
            <AppButton
              variant="secondary"
              onClick={onSecondaryAction}
              className="text-[12px] h-8 px-3 rounded-lg font-semibold"
            >
              {secondaryActionLabel}
            </AppButton>
          )}

          {actionLabel && onAction && (
            <AppButton
              variant={actionVariant}
              onClick={onAction}
              className="text-[12px] h-8 px-3.5 rounded-lg font-bold shadow-xs flex items-center gap-1.5"
            >
              {ActionIcon && <ActionIcon size={13} />}
              <span>{actionLabel}</span>
            </AppButton>
          )}
        </div>
      )}
    </div>
  );
}
