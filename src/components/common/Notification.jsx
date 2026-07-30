import React from "react";
import { AlertOctagon, ShieldCheck, X } from "lucide-react";

export default function Notification({ notice, onClose }) {
  if (!notice) return null;
  const isErr = notice.type === "error";

  return (
    <div
      className={`fixed bottom-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-[13px] font-semibold text-white animate-in slide-in-from-bottom-2 ${
        isErr ? "bg-[#B23A2E]" : "bg-[#3E6B45]"
      }`}
    >
      {isErr ? <AlertOctagon size={16} /> : <ShieldCheck size={16} />}
      <span>{notice.message}</span>
      <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
        <X size={14} />
      </button>
    </div>
  );
}
