import React from "react";

export default function StatCard({ label, value, sub, tone = "steel" }) {
  const tones = { steel: "#3B5166", amber: "#C98A2B", green: "#3E6B45", danger: "#B23A2E" };

  return (
    <div className="bg-white rounded-lg border border-[#DAD4C6] p-3 flex-1 min-w-[130px]">
      <div className="text-[11px] text-[#8A8375] font-medium uppercase tracking-wide">{label}</div>
      <div className="text-[24px] font-bold mt-0.5" style={{ color: tones[tone], fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-[#8A8375] mt-0.5">{sub}</div>}
    </div>
  );
}
