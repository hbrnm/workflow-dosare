import React from "react";
import { AlertTriangle } from "lucide-react";

export default function AlertBadge({ days, threshold }) {
  if (days < threshold) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#B23A2E] text-white text-[10px] font-bold">
      <AlertTriangle size={11} strokeWidth={2.5} />
      {days}z
    </span>
  );
}
