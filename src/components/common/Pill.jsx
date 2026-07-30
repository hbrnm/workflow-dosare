import React from "react";

export default function Pill({ children, tone = "steel" }) {
  const tones = {
    steel: "bg-[#3B5166] text-white",
    amber: "bg-[#C98A2B] text-white",
    ghost: "bg-[#E4DFD3] text-[#4A443A]",
    danger: "bg-[#B23A2E] text-white",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase ${tones[tone]}`}>
      {children}
    </span>
  );
}
