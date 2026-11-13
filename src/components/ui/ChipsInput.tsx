"use client";
import { useState } from "react";

/** Lista editable como etiquetas; envía los valores separados por salto de línea en un campo oculto. */
export default function ChipsInput({ name, initial, suggestions = [], placeholder, suggestLabel }: {
  name: string; initial: string[]; suggestions?: string[]; placeholder: string; suggestLabel?: string;
}) {
  const [items, setItems] = useState<string[]>(initial);
  const [text, setText] = useState("");
  const add = (v: string) => {
    const parts = v.split(/\n|,/).map((x) => x.trim()).filter(Boolean);
    if (parts.length) setItems((cur) => [...cur, ...parts.filter((p) => !cur.some((c) => c.toLowerCase() === p.toLowerCase()))]);
    setText("");
  };
  const missing = suggestions.filter((s) => !items.some((i) => i.toLowerCase() === s.toLowerCase()));
  return (
    <div>
      <input type="hidden" name={name} value={items.join("\n")} />
      <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-surface p-2 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
        {items.map((it) => (
          <span key={it} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-sm text-brand-700">
            {it}
            <button type="button" aria-label={`Quitar ${it}`} className="rounded-full px-1 text-brand-700 hover:bg-brand-100" onClick={() => setItems(items.filter((x) => x !== it))}>×</button>
          </span>
        ))}
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={items.length ? "Agregar otro…" : placeholder}
          className="min-w-[12rem] flex-1 bg-transparent px-1 py-1 text-sm text-ink outline-none"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(text); } else if (e.key === "Backspace" && !text && items.length) setItems(items.slice(0, -1)); }}
          onBlur={() => text.trim() && add(text)} onPaste={(e) => { const t = e.clipboardData.getData("text"); if (/\n|,/.test(t)) { e.preventDefault(); add(t); } }} />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Escriba y presione Enter; también puede pegar una lista.
        {missing.length > 0 && <> {suggestLabel} <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => setItems([...items, ...missing])}>Agregar {missing.length}</button></>}
      </p>
    </div>
  );
}
