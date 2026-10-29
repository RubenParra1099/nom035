"use client";
import { useState } from "react";
export default function CopyField({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={value} className="input font-mono text-xs" onFocus={(e) => e.target.select()} />
      <button type="button" className="btn-secondary shrink-0" onClick={async () => { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1500); }}>
        {ok ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
