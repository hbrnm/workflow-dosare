import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

function itemSrc(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.url || item.dataUrl || item.previewUrl || "";
}

function itemTitle(item, index) {
  if (!item || typeof item === "string") return `Poză ${index + 1}`;
  return item.nume || item.name || `Poză ${index + 1}`;
}

function itemCategory(item) {
  if (!item || typeof item === "string") return "";
  const c = item.categoria || item.category || "";
  return c && c !== "generale" ? c : "";
}

/**
 * Full-screen photo viewer — swipe / scroll between images without closing.
 */
export default function PhotoLightbox({
  items = [],
  startIndex = 0,
  onClose,
  onDelete,
  zIndexClass = "z-[10000]",
}) {
  const list = useMemo(
    () => (Array.isArray(items) ? items.filter((it) => itemSrc(it)) : []),
    [items]
  );
  const safeStart = Math.min(Math.max(0, startIndex), Math.max(0, list.length - 1));
  const [index, setIndex] = useState(safeStart);
  const scrollerRef = useRef(null);
  const ignoreScrollRef = useRef(false);

  useEffect(() => {
    setIndex(safeStart);
  }, [safeStart, list.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || list.length === 0) return;
    ignoreScrollRef.current = true;
    const w = el.clientWidth || 1;
    el.scrollTo({ left: safeStart * w, behavior: "auto" });
    const t = window.setTimeout(() => {
      ignoreScrollRef.current = false;
    }, 80);
    return () => window.clearTimeout(t);
  }, [safeStart, list.length]);

  const goTo = useCallback((next) => {
    if (list.length === 0) return;
    const clamped = Math.min(Math.max(0, next), list.length - 1);
    setIndex(clamped);
    const el = scrollerRef.current;
    if (!el) return;
    ignoreScrollRef.current = true;
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    window.setTimeout(() => {
      ignoreScrollRef.current = false;
    }, 320);
  }, [list.length]);

  const onScroll = useCallback(() => {
    if (ignoreScrollRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const next = Math.round(el.scrollLeft / w);
    if (next !== index && next >= 0 && next < list.length) {
      setIndex(next);
    }
  }, [index, list.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, index, onClose]);

  if (list.length === 0) return null;

  const current = list[index];
  const title = itemTitle(current, index);
  const category = itemCategory(current);
  const originalUrl = typeof current === "string" ? current : current?.url;

  return (
    <div
      className={`photo-lightbox fixed inset-0 ${zIndexClass} bg-black/95 backdrop-blur-md flex flex-col text-white select-none`}
      role="dialog"
      aria-modal="true"
      aria-label="Galerie fotografii"
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.85rem,env(safe-area-inset-top))] pb-3 shrink-0 bg-black/40 border-b border-white/10">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold truncate">{title}</div>
          <div className="text-[11px] text-white/70 font-semibold tabular-nums mt-0.5">
            {index + 1} / {list.length}
            {category ? ` · ${category}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {onDelete ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(current, index);
              }}
              className="flex items-center gap-1 text-[11px] font-extrabold text-red-300 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 px-2.5 py-1 rounded-lg transition-all cursor-pointer active:scale-95"
              title="Șterge fotografia"
            >
              <Trash2 size={13} /> Șterge
            </button>
          ) : null}
          {originalUrl ? (
            <a
              href={originalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-extrabold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 px-2.5 py-1 rounded-lg transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              Original
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-[#B23A2E] text-white transition-colors cursor-pointer active:scale-95"
            aria-label="Închide"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center">
        {list.length > 1 && (
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index <= 0}
            className="absolute left-2 z-10 p-2 rounded-full bg-black/50 hover:bg-white/15 disabled:opacity-25 transition-colors hidden sm:flex"
            aria-label="Poza anterioară"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="photo-lightbox-scroller flex-1 h-full flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-none"
          style={{ WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory" }}
        >
          {list.map((item, i) => (
            <div
              key={item?.id || item?.path || itemSrc(item) || i}
              className="w-full h-full shrink-0 snap-center flex items-center justify-center px-2 py-2"
            >
              <img
                src={itemSrc(item)}
                alt={itemTitle(item, i)}
                className="max-w-full max-h-full object-contain select-none"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {list.length > 1 && (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index >= list.length - 1}
            className="absolute right-2 z-10 p-2 rounded-full bg-black/50 hover:bg-white/15 disabled:opacity-25 transition-colors hidden sm:flex"
            aria-label="Poza următoare"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {list.length > 1 && (
        <div className="flex items-center justify-center gap-3 px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2 shrink-0 sm:hidden">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index <= 0}
            className="flex items-center gap-1 px-3 py-2 rounded-full bg-white/10 text-[12px] font-bold disabled:opacity-30"
          >
            <ChevronLeft size={18} /> Anterior
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index >= list.length - 1}
            className="flex items-center gap-1 px-3 py-2 rounded-full bg-white/10 text-[12px] font-bold disabled:opacity-30"
          >
            Următoarea <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
