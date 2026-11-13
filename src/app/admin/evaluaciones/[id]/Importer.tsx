"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { normalizeSheet, type NormalizedResponse } from "@/lib/nom035/importer";
import { buildTemplate } from "@/lib/nom035/template";
import type { GuideId } from "@/lib/nom035/guides";
import { importResponses } from "./import-actions";

type Parsed = { guide: string; responses: NormalizedResponse[]; columnsFound: number; sheet: string };

type Props = {
  evaluationId: string; guide: GuideId; existing?: number; name: string;
  departments: string[]; positions: string[]; includeGuideI: boolean;
};

export default function Importer({ evaluationId, guide, existing = 0, name, departments, positions, includeGuideI }: Props) {
  function downloadTemplate() {
    const { header, instructions } = buildTemplate(guide, { departments, positions, includeGuideI });
    const wb = XLSX.utils.book_new();
    const cap = XLSX.utils.aoa_to_sheet([header]);
    cap["!cols"] = header.map((h) => ({ wch: /^\[\d+\.-/.test(h) ? 16 : 22 }));
    cap["!freeze"] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, cap, "Captura");
    const ins = XLSX.utils.aoa_to_sheet(instructions);
    ins["!cols"] = [{ wch: 70 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, ins, "Instrucciones");
    const safe = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 _-]/g, "").trim().replace(/\s+/g, "_") || "evaluacion";
    const data = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const url = URL.createObjectURL(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Plantilla_NOM035_${guide === "GUIA_III" ? "GuiaIII" : "GuiaII"}_${safe}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(f: File) {
    setMsg(null); setParsed(null); setFileName(f.name);
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { dense: true, cellDates: false });
      // Hoja de respuestas de Google Forms: la que tenga más encabezados "[n.- …]"
      let best = { sheet: wb.SheetNames[0], score: -1 };
      for (const name of wb.SheetNames) {
        const hdr = (XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, range: 0 })[0] ?? []) as unknown[];
        const score = hdr.filter((h) => /\[\d+\.-/.test(String(h ?? ""))).length;
        if (score > best.score) best = { sheet: name, score };
      }
      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[best.sheet], { header: 1, raw: true, defval: null });
      const r = normalizeSheet(rows);
      if (r.columnsFound < 40) throw new Error("No se encontraron las columnas de los reactivos (formato \"[n.- texto]\").");
      setParsed({ ...r, sheet: best.sheet });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  }

  async function upload() {
    if (!parsed) return;
    if (existing > 0 && !window.confirm(`Esta evaluación ya tiene ${existing} respuestas importadas. ¿Agregar otras ${parsed.responses.length}? (Si es el mismo archivo, primero elimine las importadas para no duplicar.)`)) return;
    setBusy(true);
    let total = 0;
    for (let i = 0; i < parsed.responses.length; i += 100) {
      const res = await importResponses(evaluationId, parsed.guide, parsed.responses.slice(i, i + 100));
      if ("error" in res && res.error) { setMsg(res.error); setBusy(false); return; }
      total += res.ok ?? 0;
    }
    setBusy(false); setParsed(null); setFileName("");
    setMsg(`Se importaron ${total} respuestas y se calcularon con las reglas oficiales.`);
    router.refresh();
  }

  const mismatch = parsed && parsed.guide !== guide;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm">
        <p className="text-gray-700">¿Captura en papel o sin Google Forms? Descarga la plantilla, llena un renglón por trabajador y súbela aquí.</p>
        <button type="button" className="btn-secondary mt-2" onClick={downloadTemplate}>Descargar plantilla de Excel</button>
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" aria-label="Archivo de Excel o CSV"
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = ""; }} />
      <button type="button" onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
        className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${drag ? "border-brand-600 bg-brand-50" : "border-gray-300 hover:border-brand-600 hover:bg-gray-50"}`}>
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-brand-700" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span className="text-sm font-semibold text-ink">{fileName || "Arrastre aquí su archivo o haga clic para elegirlo"}</span>
        <span className="text-xs text-gray-500">Excel (.xlsx, .xls) o CSV · plantilla de la plataforma o exportación de Google Forms</span>
      </button>
      {parsed && (
        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          Hoja <b>{parsed.sheet}</b> · <b>{parsed.responses.length}</b> respuestas · detectado:{" "}
          <b>{parsed.guide === "GUIA_III" ? "Guía III (72)" : "Guía II (46)"}</b> · {parsed.columnsFound} reactivos ·{" "}
          {parsed.responses.filter((r) => r.contactName).length} con nombre para atención confidencial
          {mismatch ? <p className="mt-2 text-red-600">El archivo no corresponde a la guía de esta evaluación.</p>
            : <div className="mt-3"><button className="btn-primary" onClick={upload} disabled={busy}>{busy ? "Importando…" : "Importar respuestas"}</button></div>}
        </div>
      )}
      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </div>
  );
}
