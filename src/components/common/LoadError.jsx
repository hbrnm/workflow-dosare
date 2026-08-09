import React from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import AppButton from "./AppButton";

/** Persistent load failure — message + Retry (not just a toast). */
export default function LoadError({
  message = "Nu am putut încărca dosarele.",
  onRetry,
  offline = false,
  className = "",
}) {
  const Icon = offline ? WifiOff : AlertTriangle;
  return (
    <div className={`app-empty flex flex-col items-center gap-3 py-10 px-4 ${className}`.trim()}>
      <Icon size={22} className="text-[var(--app-danger)]" />
      <p className="font-semibold text-[var(--app-text-strong)] app-type-md text-center">
        {offline ? "Ești offline" : "Eroare la încărcare"}
      </p>
      <p className="text-[var(--app-muted)] app-type-xs max-w-sm text-center leading-relaxed">
        {offline
          ? "Verifică conexiunea la internet, apoi reîncearcă."
          : message}
      </p>
      {onRetry ? (
        <AppButton variant="primary" onClick={onRetry} className="mt-1">
          <RefreshCw size={14} /> Reîncearcă
        </AppButton>
      ) : null}
    </div>
  );
}
