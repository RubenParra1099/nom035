"use client";
import { useEffect, useState } from "react";

export type ThemePref = "system" | "light" | "dark";
const KEY = "nom035-theme";

/** Se ejecuta antes de pintar para evitar el destello del tema equivocado. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

const OPTIONS: { v: ThemePref; label: string; icon: React.ReactNode }[] = [
  { v: "light", label: "Claro", icon: <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10" r="3.5" /><path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" strokeLinecap="round" /></svg> },
  { v: "dark", label: "Oscuro", icon: <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M16.5 12.5A7 7 0 0 1 7.5 3.5a7 7 0 1 0 9 9Z" strokeLinejoin="round" /></svg> },
  { v: "system", label: "Sistema", icon: <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="3.5" width="15" height="10" rx="1.5" /><path d="M7 17h6M10 13.5V17" strokeLinecap="round" /></svg> },
];

export default function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>("system");
  useEffect(() => {
    try { setPref((localStorage.getItem(KEY) as ThemePref) || "system"); } catch {}
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { let p: ThemePref = "system"; try { p = (localStorage.getItem(KEY) as ThemePref) || "system"; } catch {} if (p === "system") apply("system"); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const choose = (v: ThemePref) => { setPref(v); try { localStorage.setItem(KEY, v); } catch {} apply(v); };
  return (
    <div role="radiogroup" aria-label="Tema de color" className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1">
      {OPTIONS.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={pref === o.v} onClick={() => choose(o.v)} title={o.label}
          className={`flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${pref === o.v ? "bg-surface text-ink shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
          {o.icon}<span className="hidden xl:inline">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
