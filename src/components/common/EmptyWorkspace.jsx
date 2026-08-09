import React from "react";
import { Plus } from "lucide-react";
import AppButton from "./AppButton";

/**
 * First-run / empty list guidance — one sentence + primary CTA.
 * ownershipHint: non-admin sees only own claims.
 */
export default function EmptyWorkspace({
  onNew,
  ownershipHint = false,
  className = "",
}) {
  return (
    <div className={`app-empty flex flex-col items-center gap-3 py-10 px-4 ${className}`.trim()}>
      <p className="font-semibold text-[var(--app-text-strong)] app-type-md">
        {ownershipHint ? "Nu ai dosare proprii încă" : "Niciun dosar în atelier"}
      </p>
      <p className="text-[var(--app-muted)] app-type-xs max-w-sm text-center leading-relaxed">
        {ownershipHint
          ? "Vezi doar dosarele create de tine. Creează primul dosar sau cere unui admin acces la toate."
          : "Creează primul dosar ca să pornești Brief, Flux și Programările."}
      </p>
      {onNew ? (
        <AppButton variant="primary" onClick={onNew} className="mt-1">
          <Plus size={14} /> Dosar nou
        </AppButton>
      ) : null}
    </div>
  );
}
