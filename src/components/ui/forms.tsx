"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal, useFormStatus } from "react-dom";

/* ---------- Panel lateral para capturar sin perder el contexto ---------- */
const DrawerCtx = createContext<{ close: () => void } | null>(null);

export function Drawer({ trigger, title, subtitle, children, triggerClass = "btn-primary", width = "max-w-lg" }: {
  trigger: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode; triggerClass?: string; width?: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  return (
    <>
      <button type="button" className={triggerClass} onClick={() => setOpen(true)}>{trigger}</button>
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex justify-end text-left print:hidden" role="dialog" aria-modal="true" aria-label={title}>
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className={`relative flex h-full w-full ${width} flex-col bg-surface shadow-2xl`}>
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div><h2 className="text-lg font-semibold text-ink">{title}</h2>{subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}</div>
              <button type="button" className="btn-secondary px-3 py-1.5" aria-label="Cerrar" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <DrawerCtx.Provider value={{ close: () => setOpen(false) }}>{children}</DrawerCtx.Provider>
            </div>
          </div>
        </div>, document.body)}
    </>
  );
}

/* ---------- Botón de guardar con estado: Guardando… / Guardado ✓ ---------- */
export function SaveButton({ children = "Guardar", className = "btn-primary", done = "Guardado ✓", closeDrawer = true }: {
  children?: React.ReactNode; className?: string; done?: string; closeDrawer?: boolean;
}) {
  const { pending } = useFormStatus();
  const ctx = useContext(DrawerCtx);
  const was = useRef(false);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (pending) { was.current = true; return; }
    if (!was.current) return;
    was.current = false;
    setOk(true);
    toast(typeof done === "string" ? done.replace(" ✓", "") : "Guardado");
    if (closeDrawer && ctx) ctx.close();
    const t = setTimeout(() => setOk(false), 1800);
    return () => clearTimeout(t);
  }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps
  return <button className={className} disabled={pending} aria-live="polite">{pending ? "Guardando…" : ok ? done : children}</button>;
}

/* ---------- Aviso flotante ---------- */
export function toast(text: string) {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.className = "fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg print:hidden";
  el.style.cssText = "background:#0B1426;color:#fff";
  el.textContent = `✓ ${text}`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.transition = "opacity .3s"; el.style.opacity = "0"; }, 2200);
  setTimeout(() => el.remove(), 2600);
}

/* ---------- Etiqueta de estado ---------- */
const TONES = {
  gray: "bg-gray-100 text-gray-700", blue: "bg-brand-50 text-brand-700", green: "bg-green-100 text-green-700",
  amber: "bg-amber-50 text-amber-800", red: "bg-red-50 text-red-700",
} as const;
export function Pill({ tone = "gray", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONES[tone]}`}>{children}</span>;
}

/* ---------- Filtro por chips con conteo (lee y escribe ?param=) ---------- */
export function FilterChips({ options, value, onChange }: { options: { id: string; label: string; count: number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist">
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={value === o.id} onClick={() => onChange(o.id)}
          className={`rounded-full border px-3 py-1 text-sm transition ${value === o.id ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-line text-gray-600 hover:border-gray-400"}`}>
          {o.label} <span className="tabular-nums text-gray-500">{o.count}</span>
        </button>
      ))}
    </div>
  );
}
