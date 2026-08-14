import React from "react";
import { User } from "lucide-react";
import { fmtDateTime } from "../../utils/dateUtils";
import { getClaimAuditMeta } from "../../utils/claimAudit";

/**
 * One-line authorship: creat de / actualizat de — uses fields already on the claim.
 */
export default function ClaimAuditMeta({ claim, className = "", compact = false }) {
  const { createdByEmail, updatedByEmail, updatedAt } = getClaimAuditMeta(claim);
  if (!createdByEmail && !updatedByEmail && !updatedAt) return null;

  const createdLabel = createdByEmail || "necunoscut";
  const updatedLabel = updatedByEmail || createdByEmail || "necunoscut";
  const whenLabel = fmtDateTime(updatedAt);

  return (
    <div
      className={`flex items-start gap-1.5 text-[11px] text-[var(--app-muted)] leading-snug ${className}`.trim()}
      title="Cine a creat și cine a editat ultima oară acest dosar"
    >
      <User size={compact ? 11 : 12} className="shrink-0 mt-0.5 opacity-70" aria-hidden />
      <p className="min-w-0">
        <span>
          Creat de <span className="font-semibold text-[var(--app-text)]">{createdLabel}</span>
        </span>
        {(updatedAt || updatedByEmail) && (
          <>
            <span className="mx-1 text-[var(--app-border)]" aria-hidden>
              ·
            </span>
            <span>
              Actualizat {whenLabel !== "—" ? whenLabel : ""}
              {updatedLabel ? (
                <>
                  {" "}
                  de <span className="font-semibold text-[var(--app-text)]">{updatedLabel}</span>
                </>
              ) : null}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
