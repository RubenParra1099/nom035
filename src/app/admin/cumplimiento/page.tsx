import Help from "@/components/ui/Help";
import { requireUser } from "@/lib/auth";
import { complianceOverview } from "@/lib/complianceOverview";
import { UMA } from "@/lib/nom035/compliance";
import ComplianceTable from "./ComplianceTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cumplimiento global · NOM-035" };
const pl = (n: number, w: string) => `${n} ${n === 1 ? w : `${w}s`}`;
const money = (v: number) => `$${Math.round(v).toLocaleString("es-MX")}`;

/** Vista global para el administrador: cumplimiento NOM-035, exposición a multas, exámenes y difusión de todos los centros. */
export default async function CompliancePage() {
  await requireUser(["SUPERADMIN"]);
  const rows = await complianceOverview();
  const ev = rows.filter((r) => r.index !== null);
  const avg = ev.length ? Math.round(ev.reduce((t, r) => t + r.index!, 0) / ev.length) : null;
  const low = ev.filter((r) => r.index! < 60).length;
  const min = rows.reduce((t, r) => t + r.fines.min, 0), max = rows.reduce((t, r) => t + r.fines.max, 0);
  const exams = rows.reduce((t, r) => t + r.exams, 0);
  const dis = rows.filter((r) => r.dissemination !== null);
  const disAvg = dis.length ? Math.round((dis.reduce((t, r) => t + r.dissemination!, 0) / dis.length) * 100) : null;
  const tiles = [
    ["Índice promedio", avg ?? "—", `${ev.length} de ${pl(rows.length, "centro")} evaluados`, avg === null ? "" : avg >= 85 ? "text-green-600" : avg >= 60 ? "text-amber-600" : "text-red-600"],
    ["Cumplimiento bajo", low, "centros con índice menor a 60", low ? "text-red-600" : ""],
    ["Exposición a multas", max ? `${money(min)} – ${money(max)}` : "$0", `suma de todos los centros · UMA ${UMA.year}`, max ? "text-red-600" : ""],
    ["Exámenes registrados", exams, `${pl(rows.filter((r) => r.exams > 0).length, "centro")} con registros (5.6)`, ""],
    ["Cobertura de difusión", disAvg === null ? "—" : `${disAvg}%`, `${pl(dis.length, "centro")} con campaña (5.7)`, ""],
  ] as const;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">Cumplimiento global<Help id="global" /></h1>
        <p className="text-sm text-gray-500">Índice de cumplimiento NOM-035, exposición a multas, exámenes médicos y difusión de la última evaluación de cada centro de trabajo.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_1.6fr_1fr_1fr]">
        {tiles.map(([l, v, d, tone]) => (
          <div key={l} className={`card p-4 ${l === "Exposición a multas" ? "col-span-2 lg:col-span-1" : ""}`}>
            <div className="text-xs font-medium text-gray-500">{l}</div>
            <div className={`mt-1 font-semibold tabular-nums text-ink ${l === "Exposición a multas" ? "text-lg" : "text-2xl"} ${tone}`}>{v}</div>
            <div className="text-[11px] text-gray-500">{d}</div>
          </div>
        ))}
      </div>
      <ComplianceTable rows={rows.map((r) => ({ ...r, checks: r.checks.map((c) => ({ id: c.id, title: c.title, numeral: c.numeral, status: c.status })) }))} />
      <p className="text-xs text-gray-500">Multas: LFT art. 994 fr. V, de 250 a 5,000 UMA por obligación pendiente o parcial; no incluye la multiplicación por trabajador afectado ni la reincidencia (art. 992). Referencia para priorizar, no asesoría legal.</p>
    </div>
  );
}
