"use client";
import { useState } from "react";
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
    const safe = name.replace(/[^\p{L}\p{N} _-]/gu, "").trim().replace(/\s+/g, "_") || "evaluacion";
    const data = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const url = URL.createObjectURL(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Plantilla_NOM035_${guide === "GUIA_III" ? "GuiaIII" : "GuiaII"}_${safe}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(f: File) {
    setMsg(null); setParsed(null);
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
    setBusy(false); setParsed(null);
    setMsg(`Se importaron ${total} respuestas y se calcularon con las reglas oficiales.`);
  }

  const mismatch = parsed && parsed.guide !== guide;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm">
        <p className="text-gray-700">¿Captura en papel o sin Google Forms? Descarga la plantilla, llena un renglón por trabajador y súbela aquí.</p>
        <button type="button" className="btn-secondary mt-2" onClick={downloadTemplate}>Descargar plantilla de Excel</button>
      </div>
      <input type="file" accept=".xlsx,.xls,.csv" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
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
