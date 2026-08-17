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
      className={`flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-400 leading-snug ${className}`.trim()}
      title="Cine a creat dosarul si data ultimei actualizari"
    >
      <User size={compact ? 11 : 12} className="shrink-0 mt-0.5 text-slate-500 dark:text-slate-400" aria-hidden />
      <p className="min-w-0">
        <span>
          Creat de <span className="font-bold text-slate-900 dark:text-slate-100">{createdLabel}</span>
        </span>
        {whenLabel && whenLabel !== "—" ? (
          <>
            <span className="mx-1 text-slate-400 dark:text-slate-500" aria-hidden>
              ·
            </span>
            <span>{whenLabel}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
