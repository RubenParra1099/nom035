"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CheckStatus } from "@/lib/nom035/compliance";

type Row = {
  companyId: string; company: string; workplaceId: string; workplace: string; headcount: number; n: number;
  evaluation: { id: string; name: string } | null; index: number | null;
  checks: { id: string; title: string; numeral: string; status: CheckStatus }[];
  fines: { min: number; max: number; pending: number }; exams: number; dissemination: number | null;
};
const money = (v: number) => `$${Math.round(v).toLocaleString("es-MX")}`;
const DOT: Record<CheckStatus, string> = { ok: "bg-green-500", partial: "bg-amber-400", no: "bg-red-500", na: "bg-gray-300 dark:bg-gray-600" };
const SHORT: Record<string, string> = { POL: "Pol", IDENT: "Eval", G1: "G-I", ATS: "Can", PROG: "Prog", MED: "Exam", QUEJAS: "Quej", DIF: "Dif", REG: "Reg" };
const SORTS = { index: "Índice (menor primero)", fines: "Exposición (mayor primero)", company: "Empresa (A–Z)" } as const;

export default function ComplianceTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<keyof typeof SORTS>("index");
  const shown = useMemo(() => rows.filter((r) => !q || `${r.company} ${r.workplace}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === "company" ? a.company.localeCompare(b.company, "es") || a.workplace.localeCompare(b.workplace, "es")
      : sort === "fines" ? b.fines.max - a.fines.max : (a.index ?? 101) - (b.index ?? 101)), [rows, q, sort]);
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <input className="input max-w-xs" placeholder="Buscar empresa o centro…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)} aria-label="Ordenar">{Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {(["ok", "partial", "no", "na"] as CheckStatus[]).map((s) => <span key={s} className="inline-flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-full ${DOT[s]}`} />{{ ok: "Cumplido", partial: "Parcial", no: "Pendiente", na: "No aplica" }[s]}</span>)}
        </span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-2">Empresa · centro</th><th className="px-2">Índice</th><th className="px-2">Obligaciones</th><th className="px-2 text-right">Exposición a multas</th><th className="px-2 text-right">Exámenes</th><th className="px-2">Difusión</th><th className="pl-2"></th>
          </tr></thead>
          <tbody>{shown.map((r) => {
            const tone = r.index === null ? "text-gray-400" : r.index >= 85 ? "text-green-600" : r.index >= 60 ? "text-amber-600" : "text-red-600";
            const bar = r.index === null ? "" : r.index >= 85 ? "bg-green-500" : r.index >= 60 ? "bg-amber-500" : "bg-red-500";
            return (
              <tr key={r.workplaceId} className="border-b border-line/60 last:border-0">
                <td className="py-2.5 pr-2"><Link href={`/admin/empresas/${r.companyId}`} className="font-medium text-ink hover:underline">{r.company}</Link><div className="text-xs text-gray-500">{r.workplace} · {r.evaluation ? `${r.evaluation.name} · ${r.n} respuestas` : "sin evaluación"}</div></td>
                <td className="w-36 px-2">{r.index === null ? <span className="text-xs text-gray-400">—</span> : <div className="flex items-center gap-2"><span className={`w-8 text-lg font-semibold tabular-nums ${tone}`}>{r.index}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><span className={`block h-full rounded-full ${bar}`} style={{ width: `${r.index}%` }} /></span></div>}</td>
                <td className="px-2"><div className="flex flex-wrap gap-1">{r.checks.map((c) => (
                  <span key={c.id} title={`${c.title} (${c.numeral})`} className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[10px] text-gray-600 dark:text-gray-300"><span className={`h-2 w-2 rounded-full ${DOT[c.status]}`} />{SHORT[c.id] ?? c.id}</span>
                ))}</div></td>
                <td className="whitespace-nowrap px-2 text-right tabular-nums">{r.fines.pending ? <><span className="font-semibold text-red-600">{money(r.fines.max)}</span><div className="text-[11px] text-gray-500">desde {money(r.fines.min)} · {r.fines.pending} pend.</div></> : r.evaluation ? <span className="text-green-600">$0</span> : "—"}</td>
                <td className="px-2 text-right tabular-nums">{r.exams || <span className="text-gray-400">0</span>}</td>
                <td className="w-32 px-2">{r.dissemination === null ? <span className="text-xs text-gray-400">Sin campaña</span> : <div className="flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><span className={`block h-full rounded-full ${r.dissemination >= 0.8 ? "bg-green-500" : "bg-brand-600"}`} style={{ width: `${r.dissemination * 100}%` }} /></span><span className="w-9 text-right text-xs tabular-nums text-gray-600">{Math.round(r.dissemination * 100)}%</span></div>}</td>
                <td className="whitespace-nowrap pl-2 text-right">{r.evaluation && <Link href={`/admin/evaluaciones/${r.evaluation.id}/indicadores?tab=metas`} className="text-sm font-medium text-brand-700 hover:underline">Ver detalle</Link>}
                  <Link href={`/admin/centros/${r.workplaceId}${r.evaluation ? `?ev=${r.evaluation.id}&sec=examenes` : "?sec=examenes"}`} className="ml-3 text-sm text-gray-500 hover:underline">Gestión</Link></td>
              </tr>
            );
          })}
          {shown.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-gray-500">Sin resultados.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  );
}
