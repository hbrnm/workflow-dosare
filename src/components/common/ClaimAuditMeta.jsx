import React from "react";
import { User } from "lucide-react";
import { fmtDateTime } from "../../utils/dateUtils";
import { getClaimAuditMeta } from "../../utils/claimAudit";

/**
 * One-line authorship: creat de + data ultimei actualizari.
 */
export default function ClaimAuditMeta({ claim, className = "", compact = false }) {
  const { createdByEmail, updatedByEmail, updatedAt } = getClaimAuditMeta(claim);
  if (!createdByEmail && !updatedByEmail && !updatedAt) return null;

  const createdLabel = createdByEmail || "necunoscut";
  const whenLabel = fmtDateTime(updatedAt);

  return (
    <div
      className={`flex items-start gap-1.5 text-[12px] font-semibold text-[var(--app-text)] leading-snug ${className}`.trim()}
      title="Cine a creat dosarul si data ultimei actualizari"
    >
      <User size={compact ? 12 : 13} className="shrink-0 mt-0.5 text-[var(--app-muted)]" aria-hidden />
      <p className="min-w-0 text-[var(--app-muted)]">
        <span>
          Creat de <span className="font-extrabold text-[var(--app-text-strong)]">{createdLabel}</span>
        </span>
        {whenLabel && whenLabel !== "—" ? (
          <>
            <span className="mx-1 text-[var(--app-muted)] opacity-70" aria-hidden>
              ·
            </span>
            <span className="text-[var(--app-text)] font-semibold">{whenLabel}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
