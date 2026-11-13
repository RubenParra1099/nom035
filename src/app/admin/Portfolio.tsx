"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LEVEL_LABEL, type Level } from "@/lib/nom035/guides";

export type PortfolioRow = {
  id: string; name: string; sector: string | null; rfc: string | null; centros: number; trabajadores: number;
  evaluaciones: number; openEvals: number; respuestas: number; avance: number | null;
  latest: { name: string; date: string } | null; worstLevel: string | null; hiPct: number | null; meanFinal: number | null;
  atsPend: number; alertsCrit: number; alertsTotal: number;
};
const LV: Record<Level, [string, string]> = {
  NULO: ["var(--lv-nulo)", "var(--lv-nulo-ink)"], BAJO: ["var(--lv-bajo)", "var(--lv-bajo-ink)"], MEDIO: ["var(--lv-medio)", "var(--lv-medio-ink)"],
  ALTO: ["var(--lv-alto)", "var(--lv-alto-ink)"], MUY_ALTO: ["var(--lv-muyalto)", "var(--lv-muyalto-ink)"],
};
const RANK = ["NULO", "BAJO", "MEDIO", "ALTO", "MUY_ALTO"];
type SortKey = "riesgo" | "nombre" | "alertas" | "avance" | "reciente";

export default function Portfolio({ rows }: { rows: PortfolioRow[] }) {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("");
  const [level, setLevel] = useState("");
  const [sort, setSort] = useState<SortKey>("riesgo");
  const sectors = useMemo(() => [...new Set(rows.map((r) => r.sector).filter(Boolean) as string[])].sort(), [rows]);
  const t = q.trim().toLowerCase();
  const shown = rows
    .filter((r) => (!t || r.name.toLowerCase().includes(t) || (r.rfc ?? "").toLowerCase().includes(t)) && (!sector || r.sector === sector) && (!level || r.worstLevel === level || (level === "SIN" && !r.worstLevel)))
    .sort((a, b) => sort === "nombre" ? a.name.localeCompare(b.name, "es")
      : sort === "alertas" ? b.alertsCrit - a.alertsCrit || b.alertsTotal - a.alertsTotal
      : sort === "avance" ? (a.avance ?? 101) - (b.avance ?? 101)
      : sort === "reciente" ? (b.latest?.date ?? "").localeCompare(a.latest?.date ?? "")
      : RANK.indexOf(b.worstLevel ?? "") - RANK.indexOf(a.worstLevel ?? "") || (b.hiPct ?? -1) - (a.hiPct ?? -1));
  const levels = RANK.filter((l) => rows.some((r) => r.worstLevel === l));

  return (
    <section className="card overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <input className="input max-w-xs" placeholder="Buscar empresa o RFC…" value={q} onChange={(e) => setQ(e.target.value)} />
        {sectors.length > 0 && (
          <select className="input w-auto" value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Giro">
            <option value="">Todos los giros</option>{sectors.map((x) => <option key={x}>{x}</option>)}
          </select>
        )}
        <div className="flex flex-wrap gap-1.5">
          {[["", "Todos"], ...levels.map((l) => [l, LEVEL_LABEL[l as Level]])].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setLevel(k)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${level === k ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-line text-gray-600 hover:border-gray-400"}`}>
              {k && <span className="h-2.5 w-2.5 rounded-full" style={{ background: LV[k as Level][0] }} />}{l}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-gray-600">Ordenar
          <select className="input w-auto py-1.5" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="riesgo">Mayor riesgo</option><option value="alertas">Más alertas</option><option value="avance">Menor avance</option>
            <option value="reciente">Evaluación más reciente</option><option value="nombre">Nombre</option>
          </select>
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="border-b border-line bg-surface-2"><tr>
            <th className="th">Empresa</th><th className="th">Centros</th><th className="th">Último resultado</th><th className="th">Alto+</th>
            <th className="th w-44">Avance de captura</th><th className="th text-center">Guía I</th><th className="th text-center">Alertas</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {shown.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="td"><Link href={`/admin/empresas/${r.id}`} className="font-semibold text-brand-700 hover:underline">{r.name}</Link>
                  <div className="text-xs text-gray-500">{[r.sector ?? "Giro sin especificar", r.rfc].filter(Boolean).join(" · ")}</div></td>
                <td className="td text-sm text-gray-700">{r.centros}<div className="text-xs text-gray-500">{r.trabajadores.toLocaleString("es-MX")} trab.</div></td>
                <td className="td">
                  {r.worstLevel ? (
                    <div className="flex items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: LV[r.worstLevel as Level][0], color: LV[r.worstLevel as Level][1] }}>{LEVEL_LABEL[r.worstLevel as Level]}</span>
                      <span className="text-sm tabular-nums text-ink">{r.meanFinal?.toFixed(1)}</span>
                    </div>
                  ) : <span className="text-sm text-gray-400">{r.latest ? "Sin datos suficientes" : "Sin evaluaciones"}</span>}
                  {r.latest && <div className="mt-0.5 text-xs text-gray-500">{r.latest.name} · {r.latest.date}</div>}
                </td>
                <td className="td text-sm tabular-nums">{r.hiPct === null ? <span className="text-gray-400">—</span> : <b className={r.hiPct >= 30 ? "text-red-600" : "text-ink"}>{Math.round(r.hiPct)}%</b>}</td>
                <td className="td">
                  {r.avance === null ? <span className="text-sm text-gray-400">—</span> : (<>
                    <div className="flex justify-between text-xs text-gray-500"><span>{r.respuestas} resp.</span><span className="font-semibold text-ink">{r.avance}%</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-200"><div className={`h-1.5 rounded-full ${r.avance >= 100 ? "bg-green-600" : "bg-brand-600"}`} style={{ width: `${r.avance}%` }} /></div>
                    {r.openEvals > 0 && <div className="mt-0.5 text-[11px] text-green-700">{r.openEvals} {r.openEvals === 1 ? "captura abierta" : "capturas abiertas"}</div>}
                  </>)}
                </td>
                <td className="td text-center">{r.atsPend ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">{r.atsPend} sin canalizar</span> : <span className="text-gray-400">—</span>}</td>
                <td className="td text-center">
                  {r.alertsTotal ? <Link href="/admin/alertas" className="inline-flex items-center gap-1 text-sm hover:underline">
                    {r.alertsCrit > 0 && <span className="rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">{r.alertsCrit}</span>}
                    <span className="text-gray-700">{r.alertsTotal}</span></Link> : <span className="text-gray-400">—</span>}
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={7} className="td py-8 text-center text-gray-500">{rows.length ? "Ninguna empresa coincide con los filtros." : "Aún no hay empresas. Cree la primera con “+ Nueva empresa”."}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-gray-500">Último resultado: el nivel más alto entre las evaluaciones más recientes de los centros de la empresa (con al menos 5 respuestas). Alto+: % de trabajadores en nivel alto o muy alto.</p>
    </section>
  );
}
