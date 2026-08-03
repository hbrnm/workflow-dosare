import React from "react";
import { AlertOctagon, ShieldCheck, X } from "lucide-react";

export default function Notification({ notice, onClose }) {
  if (!notice) return null;
  const isErr = notice.type === "error";

  return (
    <div
      className={`fixed top-3 left-3 right-3 sm:top-auto sm:left-auto sm:right-4 sm:bottom-4 z-[100001] flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-2xl text-[13px] font-bold text-white animate-in fade-in slide-in-from-top-2 sm:slide-in-from-bottom-2 ${
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
