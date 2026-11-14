"use client";
import { useMemo, useState, useTransition } from "react";
import Help from "@/components/ui/Help";
import { toast } from "@/components/ui/forms";
import { saveComplianceMark, saveKpiTargets } from "@/app/admin/gestion-actions";
import { GUIDES, LEVELS, LEVEL_LABEL, levelFor, type GuideId, type Level } from "@/lib/nom035/guides";
import { aggregate, scoreWorker, type ScoreResult } from "@/lib/nom035/score";
import { computeKpis, type InterventionData, type Kpi, type KpiRec } from "@/lib/nom035/kpis";
import { complianceChecks, STATUS_LABEL, type CheckResult, type CheckStatus, type ManualMark } from "@/lib/nom035/compliance";
import { POLICIES, kpiTarget } from "@/lib/nom035/policies";
import { meanChange } from "@/lib/nom035/stats";
import { LEVEL_HEX, LevelStack } from "./charts";

export type GoalsData = {
  compliance: Record<string, ManualMark>; targets: Record<string, number>; prevTargets: Record<string, number>; reportSaved: boolean;
};
type Prev = { id: string; name: string; records: KpiRec[] };
type Props = {
  ev: { id: string; name: string; guide: GuideId; includeGuideI: boolean; headcount: number };
  records: KpiRec[]; scores: ScoreResult[]; fScores: ScoreResult[]; previous: Prev[];
  intervention: InterventionData; areaHeadcount: Record<string, number>; minGroup: number;
  goals: GoalsData; canEdit: boolean; filtered: boolean;
};

const SUB = [
  { id: "cumplimiento", label: "Cumplimiento NOM-035" },
  { id: "metas", label: "Metas por KPI" },
  { id: "efectividad", label: "Efectividad de políticas" },
  { id: "simulador", label: "Simulador" },
] as const;
type SubId = (typeof SUB)[number]["id"];

const ST_STYLE: Record<CheckStatus, string> = {
  ok: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  no: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  na: "bg-surface-2 text-gray-500",
};
const ST_ICON: Record<CheckStatus, string> = { ok: "✓", partial: "½", no: "✕", na: "—" };
const LIGHT: Record<string, string> = { ROJO: "text-red-600", AMARILLO: "text-amber-600", VERDE: "text-green-600", SIN_DATOS: "text-gray-500" };

const isPct = (k: Kpi) => k.display.includes("%");
const fmtK = (k: Kpi, v: number | null | undefined) => (v == null || !Number.isFinite(v) ? "—" : isPct(k) ? `${v.toFixed(Math.abs(v) < 10 ? 1 : 0)}%` : v.toFixed(Math.abs(v) < 2 ? 2 : 1));

function LevelBadge({ level }: { level: Level }) {
  return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink"><span className="h-2.5 w-2.5 rounded-full" style={{ background: LEVEL_HEX[level] }} />{LEVEL_LABEL[level]}</span>;
}

export default function Goals(p: Props) {
  const [sub, setSub] = useState<SubId>("cumplimiento");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 print:hidden">
        {SUB.map((t) => (
          <button key={t.id} type="button" onClick={() => setSub(t.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${sub === t.id ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-line text-gray-600 hover:border-gray-400"}`}>{t.label}</button>
        ))}
      </div>
      {sub === "cumplimiento" && <Compliance {...p} />}
      {sub === "metas" && <Targets {...p} />}
      {sub === "efectividad" && <Effectiveness {...p} />}
      {sub === "simulador" && <Simulator {...p} />}
    </div>
  );
}

/* ---------- 1 · Índice de cumplimiento ---------- */
function Compliance({ ev, records, scores, intervention, goals, canEdit, filtered }: Props) {
  const [marks, setMarks] = useState(goals.compliance);
  const agg = useMemo(() => (scores.length ? aggregate(ev.guide, scores) : null), [ev.guide, scores]);
  const atsRequired = records.filter((r) => r.g1 === 2).length;
  const atsCanalized = intervention.ats.filter((a) => a.canalizedAt || ["CANALIZADO", "EN_ATENCION", "ATENDIDO"].includes(a.status)).length;
  const { checks, index, counts } = complianceChecks({
    guide: ev.guide, includeGuideI: ev.includeGuideI, headcount: ev.headcount, n: records.length, finalLevel: agg?.final.level ?? null,
    atsRequired, atsCanalized: Math.min(atsCanalized, atsRequired), actions: intervention.actions, complaints: intervention.complaints.length,
    trainings: intervention.trainings.length, reportSaved: goals.reportSaved, manual: marks,
  });
  const color = index === null ? "#6B7280" : index >= 85 ? "#16A34A" : index >= 60 ? "#D97706" : "#DC2626";
  const verdict = index === null ? "Sin datos" : index >= 85 ? "Cumplimiento alto" : index >= 60 ? "Cumplimiento parcial" : "Cumplimiento bajo";
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <section className="card flex flex-col items-center p-5 text-center">
        <h2 className="flex items-center gap-1.5 self-start text-base font-semibold text-ink">Índice de cumplimiento<Help id="g.indice" /></h2>
        <svg viewBox="0 0 160 160" className="mt-3 w-44">
          <circle cx="80" cy="80" r="64" fill="none" stroke="var(--line)" strokeWidth="14" />
          <circle cx="80" cy="80" r="64" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" transform="rotate(-90 80 80)"
            strokeDasharray={`${((index ?? 0) / 100) * 2 * Math.PI * 64} ${2 * Math.PI * 64}`} />
          <text x="80" y="84" textAnchor="middle" className="fill-[var(--ink)]" style={{ fontSize: 38, fontWeight: 700 }}>{index ?? "—"}</text>
          <text x="80" y="106" textAnchor="middle" className="fill-gray-500" style={{ fontSize: 11 }}>de 100</text>
        </svg>
        <div className="mt-1 text-sm font-semibold" style={{ color }}>{verdict}</div>
        <div className="mt-4 grid w-full grid-cols-4 gap-1.5 text-xs">
          {(["ok", "partial", "no", "na"] as CheckStatus[]).map((s) => (
            <div key={s} className={`rounded-lg px-1 py-2 ${ST_STYLE[s]}`}><div className="text-lg font-semibold tabular-nums">{counts[s]}</div>{STATUS_LABEL[s]}</div>
          ))}
        </div>
        <p className="mt-4 text-left text-xs text-gray-500">Cumplido vale 1 y parcial 0.5; lo que no aplica no cuenta. Se calcula con todo el centro de trabajo{filtered ? " (no le afectan los filtros)" : ""}.</p>
      </section>
      <section className="card divide-y divide-line p-0">
        {checks.map((c) => <CheckRow key={c.id} c={c} evaluationId={ev.id} canEdit={canEdit} onSaved={(m) => setMarks((x) => ({ ...x, [c.id]: m }))} />)}
      </section>
    </div>
  );
}

function CheckRow({ c, evaluationId, canEdit, onSaved }: { c: CheckResult; evaluationId: string; canEdit: boolean; onSaved: (m: ManualMark) => void }) {
  const [note, setNote] = useState(c.mark?.note ?? "");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const editable = canEdit && c.source !== "auto" && c.status !== "na";
  const save = (done: boolean) => start(async () => {
    try { await saveComplianceMark({ evaluationId, id: c.id, done, note: note || undefined }); onSaved({ done, note: note || undefined, at: new Date().toISOString().slice(0, 10) }); toast(done ? "Marcado como cumplido" : "Marca retirada"); setOpen(false); }
    catch { toast("No se pudo guardar"); }
  });
  return (
    <div className="flex flex-wrap items-start gap-3 p-4">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ST_STYLE[c.status]}`}>{ST_ICON[c.status]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{c.title}</span>
          <span className="text-xs text-gray-500">NOM-035 · {c.numeral}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ST_STYLE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
          <span className="text-[11px] text-gray-400">{c.source === "auto" ? "Automático" : c.source === "manual" ? "Lo confirma el consultor" : "Registros o confirmación"}</span>
        </div>
        <p className="text-sm text-gray-600">{c.what}</p>
        <p className="mt-0.5 text-xs text-gray-500">{c.detail}{c.mark?.at && c.mark.done ? ` · ${c.mark.at}` : ""}</p>
        {open && (
          <div className="mt-2 flex flex-wrap gap-2">
            <input className="input min-w-0 flex-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Evidencia (opcional): p. ej. política firmada el 10/03, publicada en intranet" maxLength={300} />
            <button type="button" className="btn-primary" disabled={pending} onClick={() => save(true)}>Marcar cumplido</button>
            {c.mark?.done && <button type="button" className="btn-secondary" disabled={pending} onClick={() => save(false)}>Quitar marca</button>}
          </div>
        )}
      </div>
      {editable && !open && <button type="button" className="btn-secondary px-3 py-1.5 text-sm print:hidden" onClick={() => setOpen(true)}>{c.mark?.done ? "Editar" : "Confirmar"}</button>}
    </div>
  );
}

/* ---------- 2 · Metas por KPI ---------- */
function Targets({ ev, records, previous, intervention, areaHeadcount, minGroup, goals, canEdit }: Props) {
  const prev = previous[0];
  const cur = useMemo(() => computeKpis({ guide: ev.guide, records, minGroup, headcount: ev.headcount, intervention, areaHeadcount, population: ev.headcount || null, prevRecords: prev?.records }), [ev, records, prev, intervention, areaHeadcount, minGroup]);
  const base = useMemo(() => (prev ? Object.fromEntries(computeKpis({ guide: ev.guide, records: prev.records, minGroup, headcount: ev.headcount }).filter((k) => k.scope === "encuesta").map((k) => [k.id, k.value])) : {}), [ev, prev, minGroup]);
  const rows = cur.filter((k) => k.value !== null && k.dir && k.green != null);
  const sugg = (k: Kpi) => { const v = kpiTarget(k)?.value; return v == null ? null : Math.round(v * (isPct(k) ? 1 : 100)) / (isPct(k) ? 1 : 100); };
  const initial = () => Object.fromEntries(rows.map((k) => [k.id, goals.targets[k.id] ?? sugg(k)])) as Record<string, number | null>;
  const [t, setT] = useState(initial);
  const [only, setOnly] = useState(false);
  const [pending, start] = useTransition();
  const shown = only ? rows.filter((k) => k.light !== "VERDE") : rows;
  const committed = rows.filter((k) => goals.prevTargets[k.id] != null);
  const met = committed.filter((k) => (k.dir === "lower" ? k.value! <= goals.prevTargets[k.id] : k.value! >= goals.prevTargets[k.id])).length;

  const save = () => start(async () => {
    try { await saveKpiTargets({ evaluationId: ev.id, targets: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100])) }); toast("Metas guardadas"); }
    catch { toast("No se pudieron guardar las metas"); }
  });

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-ink">Metas por KPI<Help id="g.metas" /></h2>
          <p className="text-xs text-gray-500">Línea base: {prev ? prev.name : "sin evaluación anterior"} · Actual: {ev.name}. Las metas que fije aquí se revisan en la siguiente evaluación.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <label className="flex items-center gap-1.5 text-sm text-gray-600"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} />Solo amarillo y rojo</label>
          {canEdit && <><button type="button" className="btn-secondary" onClick={() => setT(Object.fromEntries(rows.map((k) => [k.id, sugg(k)])))}>Usar sugeridas</button>
            <button type="button" className="btn-primary" disabled={pending} onClick={save}>{pending ? "Guardando…" : "Guardar metas"}</button></>}
        </div>
      </div>
      {committed.length > 0 && (
        <div className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">Metas comprometidas en <b>{prev?.name}</b>: <b>{met} de {committed.length}</b> cumplidas en esta evaluación.</div>
      )}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-2">Indicador</th><th className="px-2 text-right">Línea base</th><th className="px-2 text-right">Meta comprometida</th><th className="px-2 text-right">Actual</th><th className="px-2">Avance</th><th className="pl-2 text-right">Meta siguiente</th>
          </tr></thead>
          <tbody>{shown.map((k) => {
            const b = base[k.id] ?? null, goal = goals.prevTargets[k.id] ?? null, a = k.value!;
            const reached = goal != null && (k.dir === "lower" ? a <= goal : a >= goal);
            const prog = goal != null && b != null ? (goal === b ? (reached ? 1 : 0) : Math.max(0, Math.min(1, (a - b) / (goal - b)))) : null;
            return (
              <tr key={k.id} className="border-b border-line/60 last:border-0">
                <td className="py-2 pr-2"><span className="font-medium text-ink">{k.short}</span> <span className="text-gray-600">{k.name}</span><div className="text-[11px] text-gray-400">{k.dir === "lower" ? "Menor es mejor" : "Mayor es mejor"} · verde {k.dir === "lower" ? "<" : "≥"} {fmtK(k, k.green)}</div></td>
                <td className="px-2 text-right tabular-nums text-gray-600">{fmtK(k, b)}</td>
                <td className="px-2 text-right tabular-nums text-gray-600">{fmtK(k, goal)}</td>
                <td className={`px-2 text-right font-semibold tabular-nums ${LIGHT[k.light]}`}>{k.display}</td>
                <td className="w-40 px-2">{goal != null && b == null && !reached ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">No cumplida</span> : reached ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-300">Cumplida</span>
                  : prog != null ? <div className="flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><span className="block h-full rounded-full bg-brand-600" style={{ width: `${prog * 100}%` }} /></span><span className="w-9 text-right text-xs tabular-nums text-gray-600">{Math.round(prog * 100)}%</span></div>
                  : <span className="text-xs text-gray-400">Sin meta anterior</span>}</td>
                <td className="pl-2 text-right">
                  {canEdit ? <span className="inline-flex items-center gap-1"><input type="number" step="any" className="input w-24 py-1 text-right tabular-nums" value={t[k.id] == null ? "" : Math.round(t[k.id]! * 100) / 100}
                    onChange={(e) => setT((x) => ({ ...x, [k.id]: e.target.value === "" ? null : Number(e.target.value) }))} aria-label={`Meta ${k.short}`} /><span className="w-3 text-xs text-gray-500">{isPct(k) ? "%" : ""}</span></span>
                    : <span className="tabular-nums">{fmtK(k, t[k.id])}</span>}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-500">Meta sugerida: llegar a verde o mejorar 30%. Avance = qué tanto del camino entre la línea base y la meta comprometida se recorrió. Las metas se calculan con todo el centro de trabajo.</p>
    </section>
  );
}

/* ---------- 3 · Efectividad por política ---------- */
function Effectiveness({ ev, scores, previous, intervention }: Props) {
  const g = GUIDES[ev.guide];
  const prev = previous[0];
  const prevScores = useMemo(() => (prev ? prev.records.map((r) => scoreWorker(ev.guide, Object.fromEntries(r.it.map((v, i) => [i + 1, v])))) : []), [prev, ev.guide]);
  if (!prev) return <div className="card p-10 text-center text-sm text-gray-600">Para medir la efectividad se necesita una evaluación anterior del mismo centro y guía. Cuando se aplique la siguiente, aquí verá si las políticas redujeron el riesgo.</div>;
  const hi = (ss: ScoreResult[], d: string) => (ss.length ? (ss.filter((s) => s.domains[d] >= g.domainCuts[d][2]).length / ss.length) * 100 : 0);
  const rows = POLICIES.filter((p) => p.domains.some((d) => g.domains[d])).map((p) => {
    const doms = p.domains.filter((d) => g.domains[d]).map((d) => {
      const ch = meanChange(scores.map((s) => s.domains[d]), prevScores.map((s) => s.domains[d]));
      const now = scores.reduce((t, s) => t + s.domains[d], 0) / scores.length, before = prevScores.reduce((t, s) => t + s.domains[d], 0) / prevScores.length;
      return { d, now, before, ch, hiNow: hi(scores, d), hiBefore: hi(prevScores, d), lvNow: levelFor(now, g.domainCuts[d]), lvBefore: levelFor(before, g.domainCuts[d]) };
    });
    const acts = intervention.prevActions.filter((a) => p.domains.includes(a.domain) || a.domain === p.title);
    const done = acts.filter((a) => a.doneAt).length;
    const better = doms.some((x) => x.ch?.significant && x.ch.delta < 0), worse = doms.some((x) => x.ch?.significant && x.ch.delta > 0);
    const verdict = acts.length === 0 ? (better && !worse ? "Mejoró sin acciones" : "Sin acciones")
      : done === 0 ? "Acciones sin cumplir" : worse ? "Revisar" : better ? "Efectiva" : "Sin cambio medible";
    return { p, doms, acts: acts.length, done, verdict };
  }).sort((a, b) => (b.acts > 0 ? 1 : 0) - (a.acts > 0 ? 1 : 0) || ORDER.indexOf(a.verdict) - ORDER.indexOf(b.verdict));
  const withActs = rows.filter((r) => r.acts > 0);
  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-1.5 text-base font-semibold text-ink">Efectividad por política<Help id="g.efectividad" /></h2>
      <p className="text-xs text-gray-500">Compara {prev.name} contra {ev.name} en los dominios que atiende cada política, junto con las acciones del programa registradas en el periodo anterior.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {ORDER.map((v) => <div key={v} className="rounded-xl border border-line p-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${VERDICT[v]}`}>{v}</span><div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{rows.filter((r) => r.verdict === v).length}</div></div>)}
      </div>
      {withActs.length === 0 && <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm text-gray-600">En {prev.name} no se registraron acciones vinculadas a políticas. Los cambios que se muestran no se pueden atribuir a una intervención.</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-gray-500"><th className="py-2 pr-2">Política</th><th className="px-2">Acciones</th><th className="px-2">Dominio</th><th className="px-2">Nivel</th><th className="px-2 text-right">Alto o muy alto</th><th className="px-2 text-right">Cambio</th><th className="pl-2">Resultado</th></tr></thead>
          <tbody>{rows.map((r) => r.doms.map((x, i) => (
            <tr key={r.p.id + x.d} className={i === r.doms.length - 1 ? "border-b border-line/60" : ""}>
              {i === 0 && <td rowSpan={r.doms.length} className="py-2 pr-2 align-top font-medium text-ink">{r.p.title}<div className="text-[11px] font-normal text-gray-500">NOM-035 · {r.p.numeral}</div></td>}
              {i === 0 && <td rowSpan={r.doms.length} className="whitespace-nowrap px-2 align-top tabular-nums text-gray-600">{r.acts ? `${r.done} de ${r.acts} cumplidas` : "—"}</td>}
              <td className="px-2 py-1.5 text-gray-700">{x.d}</td>
              <td className="whitespace-nowrap px-2"><span className="inline-flex items-center gap-1 text-xs"><LevelBadge level={x.lvBefore} /> → <LevelBadge level={x.lvNow} /></span></td>
              <td className="whitespace-nowrap px-2 text-right tabular-nums text-gray-600">{Math.round(x.hiBefore)}% → <b className="text-ink">{Math.round(x.hiNow)}%</b></td>
              <td className={`whitespace-nowrap px-2 text-right tabular-nums ${x.ch?.significant ? (x.ch.delta < 0 ? "font-semibold text-green-600" : "font-semibold text-red-600") : "text-gray-500"}`}>{x.ch ? `${x.ch.delta > 0 ? "+" : ""}${x.ch.delta.toFixed(1)} pts${x.ch.significant ? " *" : ""}` : "—"}</td>
              {i === 0 && <td rowSpan={r.doms.length} className="pl-2 align-top"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${VERDICT[r.verdict]}`}>{r.verdict}</span></td>}
            </tr>
          )))}</tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-500">* Cambio estadísticamente significativo (95% de confianza). Un puntaje menor significa menos riesgo. Se calcula con todo el centro de trabajo.</p>
    </section>
  );
}
const ORDER = ["Efectiva", "Sin cambio medible", "Revisar", "Acciones sin cumplir", "Mejoró sin acciones", "Sin acciones"];
const VERDICT: Record<string, string> = {
  "Efectiva": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "Sin cambio medible": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "Revisar": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "Acciones sin cumplir": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "Sin acciones": "bg-surface-2 text-gray-500",
  "Mejoró sin acciones": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

/* ---------- 4 · Simulador ---------- */
function Simulator({ ev, fScores, filtered }: Props) {
  const g = GUIDES[ev.guide];
  const domains = Object.keys(g.domains);
  const n = fScores.length;
  const before = useMemo(() => aggregate(ev.guide, fScores), [ev.guide, fScores]);
  const priority = before.domains.filter((d) => LEVELS.indexOf(d.level) >= 2).map((d) => d.name);
  const [red, setRed] = useState<Record<string, number>>(() => Object.fromEntries(domains.map((d) => [d, priority.includes(d) ? 20 : 0])));
  const preset = (v: number, only = true) => setRed(Object.fromEntries(domains.map((d) => [d, !only || priority.includes(d) ? v : 0])));

  const sim = useMemo(() => {
    const finals = fScores.map((s) => s.final - domains.reduce((t, d) => t + s.domains[d] * (red[d] ?? 0) / 100, 0));
    const dist = Object.fromEntries(LEVELS.map((l) => [l, 0])) as Record<Level, number>;
    finals.forEach((f) => dist[levelFor(f, g.finalCuts)]++);
    const mean = finals.reduce((t, f) => t + f, 0) / (n || 1);
    const doms = domains.map((d) => {
      const vals = fScores.map((s) => s.domains[d] * (1 - (red[d] ?? 0) / 100));
      const m = vals.reduce((t, v) => t + v, 0) / (n || 1);
      const b = before.domains.find((x) => x.name === d)!;
      return { d, before: b.level, after: levelFor(m, g.domainCuts[d]), hiBefore: ((b.distribution.ALTO + b.distribution.MUY_ALTO) / n) * 100, hiAfter: (vals.filter((v) => v >= g.domainCuts[d][2]).length / n) * 100 };
    });
    return { mean, level: levelFor(mean, g.finalCuts), dist, hi: ((dist.ALTO + dist.MUY_ALTO) / n) * 100, doms };
  }, [fScores, red, domains, g, n, before]);
  const hiBefore = ((before.final.distribution.ALTO + before.final.distribution.MUY_ALTO) / n) * 100;
  const out = Math.round(((hiBefore - sim.hi) / 100) * n);
  const Tile = ({ label, a, b, la, lb }: { label: string; a: string; b: string; la?: Level; lb?: Level }) => (
    <div className="rounded-xl border border-line p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2"><span className="text-lg tabular-nums text-gray-500">{a}</span><span className="text-gray-400">→</span><span className="text-2xl font-semibold tabular-nums text-ink">{b}</span></div>
      {la && lb && <div className="mt-1 flex items-center gap-1 text-xs"><LevelBadge level={la} /> → <LevelBadge level={lb} /></div>}
    </div>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="card p-5">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-ink">¿Qué pasaría si…?<Help id="g.simulador" /></h2>
        <p className="text-xs text-gray-500">Indique cuánto esperaría reducir el puntaje de cada dominio con las políticas.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => preset(10)}>Conservador (10%)</button>
          <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => preset(20)}>Esperado (20%)</button>
          <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => preset(35)}>Ambicioso (35%)</button>
          <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => preset(0, false)}>Limpiar</button>
        </div>
        <div className="mt-4 space-y-3">
          {domains.map((d) => (
            <label key={d} className="block">
              <span className="flex items-center justify-between gap-2 text-sm"><span className={priority.includes(d) ? "font-medium text-ink" : "text-gray-600"}>{d}{priority.includes(d) && <span className="ml-1 text-[10px] font-semibold text-red-600">prioritario</span>}</span><span className="tabular-nums text-gray-600">{red[d] ? `−${red[d]}%` : "0%"}</span></span>
              <input type="range" min={0} max={50} step={5} value={red[d] ?? 0} onChange={(e) => setRed((r) => ({ ...r, [d]: Number(e.target.value) }))} className="w-full accent-[var(--brand-600,#1D4ED8)]" aria-label={`Reducción ${d}`} />
            </label>
          ))}
        </div>
      </section>
      <section className="card p-5">
        <h2 className="text-base font-semibold text-ink">Resultado estimado</h2>
        <p className="text-xs text-gray-500">{n} cuestionarios{filtered ? " con los filtros aplicados" : ""}. Es una estimación: supone que la reducción aplica por igual a todas las personas.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Tile label="Calificación final" a={before.final.mean.toFixed(1)} b={sim.mean.toFixed(1)} la={before.final.level} lb={sim.level} />
          <Tile label="Alto o muy alto" a={`${Math.round(hiBefore)}%`} b={`${Math.round(sim.hi)}%`} />
          <div className="rounded-xl border border-line p-3"><div className="text-xs uppercase tracking-wide text-gray-500">Personas que salen de riesgo alto</div><div className="mt-1 text-2xl font-semibold tabular-nums text-green-600">{Math.max(0, out)}</div><div className="text-xs text-gray-500">de {before.final.distribution.ALTO + before.final.distribution.MUY_ALTO}</div></div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div><div className="mb-1 text-xs text-gray-500">Hoy</div><LevelStack dist={before.final.distribution} total={n} height={16} /></div>
          <div><div className="mb-1 text-xs text-gray-500">Con las políticas</div><LevelStack dist={sim.dist} total={n} height={16} /></div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-gray-500"><th className="py-2 pr-2">Dominio</th><th className="px-2">Nivel</th><th className="pl-2 text-right">Alto o muy alto</th></tr></thead>
            <tbody>{sim.doms.filter((x) => (red[x.d] ?? 0) > 0).map((x) => (
              <tr key={x.d} className="border-b border-line/60 last:border-0"><td className="py-1.5 pr-2 text-gray-700">{x.d}</td>
                <td className="px-2"><span className="inline-flex items-center gap-1 text-xs"><LevelBadge level={x.before} /> → <LevelBadge level={x.after} /></span></td>
                <td className="pl-2 text-right tabular-nums text-gray-600">{Math.round(x.hiBefore)}% → <b className="text-ink">{Math.round(x.hiAfter)}%</b></td></tr>
            ))}</tbody>
          </table>
          {Object.values(red).every((v) => !v) && <p className="py-3 text-center text-sm text-gray-500">Mueva algún control para ver el efecto.</p>}
        </div>
      </section>
    </div>
  );
}
