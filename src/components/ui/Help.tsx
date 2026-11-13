"use client";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HELP, type HelpId } from "@/lib/help";

/**
 * Signo de interrogación con ayuda contextual.
 * Se despliega al pasar el mouse, al enfocarlo con el teclado o al tocarlo en celular.
 */
export default function Help({ id, text, title, className = "" }: { id?: HelpId; text?: React.ReactNode; title?: string; className?: string }) {
  const entry = id ? HELP[id] : undefined;
  const body = text ?? entry?.text;
  const head = title ?? entry?.title;
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipId = useId();

  const place = useCallback(() => {
    const b = btn.current?.getBoundingClientRect();
    if (!b) return;
    const w = Math.min(320, window.innerWidth - 24);
    const h = pop.current?.offsetHeight ?? 120;
    const left = Math.max(12, Math.min(b.left + b.width / 2 - w / 2, window.innerWidth - w - 12));
    const below = b.bottom + h + 12 < window.innerHeight || b.top < h + 12;
    setPos({ left, top: below ? b.bottom + 8 : b.top - h - 8, below });
  }, []);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e.type === "pointerdown" && (btn.current?.contains(e.target as Node) || pop.current?.contains(e.target as Node))) return;
      setOpen(false); setPinned(false);
    };
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open, place]);

  if (!body) return null;
  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true); };
  const hide = () => { if (pinned) return; timer.current = setTimeout(() => setOpen(false), 120); };

  return (
    <>
      <button ref={btn} type="button" aria-label={`Ayuda${head ? `: ${head}` : ""}`} aria-describedby={open ? tipId : undefined} aria-expanded={open}
        onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (open && pinned) { setOpen(false); setPinned(false); } else { show(); setPinned(true); } }}
        className={`help-q inline-grid h-[18px] w-[18px] shrink-0 cursor-help place-items-center rounded-full border border-gray-300 bg-surface align-middle text-[11px] font-bold leading-none text-gray-500 transition hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-600 print:hidden ${open ? "border-brand-600 bg-brand-50 text-brand-700" : ""} ${className}`}>
        ?
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={pop} id={tipId} role="tooltip" onMouseEnter={show} onMouseLeave={hide}
          className="fixed z-[70] w-[min(320px,calc(100vw-24px))] rounded-xl border border-line bg-surface p-3.5 text-left text-[13px] font-normal normal-case leading-relaxed tracking-normal text-gray-700 shadow-xl print:hidden"
          style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}>
          {head && <div className="mb-1 text-[13px] font-semibold text-ink">{head}</div>}
          <div className="space-y-1.5">{typeof body === "string" ? body.split("\n").map((t, i) => <p key={i}>{t}</p>) : body}</div>
        </div>,
        document.body,
      )}
    </>
  );
}
