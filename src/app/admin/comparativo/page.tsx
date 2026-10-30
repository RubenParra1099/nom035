import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { BENCH_KPIS, CATEGORY_ORDER, levelOfIndex, loadBenchmark, quantiles, scopeFor, type BenchRow } from "@/lib/benchmark";
import { LEVEL_LABEL, type Level } from "@/lib/nom035/guides";
import { SECTORS } from "@/lib/sectors";

export const dynamic = "force-dynamic";

const LV: Record<Level, [string, string]> = {
  NULO: ["var(--lv-nulo)", "var(--lv-nulo-ink)"], BAJO: ["var(--lv-bajo)", "var(--lv-bajo-ink)"], MEDIO: ["var(--lv-medio)", "var(--lv-medio-ink)"],
  ALTO: ["var(--lv-alto)", "var(--lv-alto-ink)"], MUY_ALTO: ["var(--lv-muyalto)", "var(--lv-muyalto-ink)"],
};
const LIGHT: Record<string, [string, string]> = {
  VERDE: ["var(--lv-bajo)", "var(--lv-bajo-ink)"], AMARILLO: ["var(--lv-medio)", "var(--lv-medio-ink)"],
  ROJO: ["var(--lv-muyalto)", "var(--lv-muyalto-ink)"], SIN_DATOS: ["var(--lv-none)", "var(--lv-none-ink)"],
};
const f1 = (n: number) => (Number.isFinite(n) ? n.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—");
const HIGHER_BETTER = new Set(["LR-03", "CC-04"]);
const MIN_POOL = 3;
const SHORT_CAT: Record<string, string> = {
  "Ambiente de trabajo": "Ambiente", "Factores propios de la actividad": "Factores propios", "Organización del tiempo de trabajo": "Org. del tiempo",
  "Liderazgo y relaciones en el trabajo": "Liderazgo y relaciones", "Entorno organizacional": "Entorno org.",
};

type Metric = { key: string; label: string; unit: string; get: (r: BenchRow) => number | null; better: "low" | "high"; fmt: (v: number) => string };

export default async function BenchmarkPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const s = await requireUser();
  const all = await loadBenchmark();
  const { own, anonymous } = scopeFor(s, all);
  const guia = sp.guia ?? "";
  const sector = sp.sector ?? "";
  const pool = all.filter((r) => (!guia || r.guide === guia) && (!sector || r.sector === sector));
  const visible = anonymous ? pool.filter((r) => own.has(r.workplaceId)) : pool;
  const focusId = sp.centro && visible.some((r) => r.workplaceId === sp.centro) ? sp.centro : visible[0]?.workplaceId;
  const focus = pool.find((r) => r.workplaceId === focusId);
  const label = (r: BenchRow, i: number) => (anonymous && !own.has(r.workplaceId) ? `Centro ${String.fromCharCode(65 + (i % 26))}` : `${r.company} · ${r.workplace}`);
  const enough = pool.length >= MIN_POOL;

  const metrics: Metric[] = [
    { key: "hi", label: "Trabajadores en alto o muy alto", unit: "%", get: (r) => r.hi, better: "low", fmt: (v) => `${f1(v)}%` },
    ...CATEGORY_ORDER.map((c) => ({ key: c, label: `${c} (índice 0–5)`, unit: "", get: (r: BenchRow) => r.categories[c]?.idx ?? null, better: "low" as const, fmt: (v: number) => f1(v) })),
    ...BENCH_KPIS.map((id) => {
      const sample = pool.find((r) => r.kpis[id])?.kpis[id];
      const isPct = !["LR-03", "CC-04"].includes(id);
      return { key: id, label: `${id} · ${sample?.name ?? id}`, unit: isPct ? "%" : "", get: (r: BenchRow) => r.kpis[id]?.value ?? null, better: HIGHER_BETTER.has(id) ? "high" as const : "low" as const, fmt: (v: number) => (isPct ? `${f1(v)}%` : f1(v)) };
    }),
  ];
  const sorted = [...pool].sort((a, b) => b.hi - a.hi);
  const meanHi = pool.reduce((t, r) => t + r.hi, 0) / (pool.length || 1);
  const sectorPool = focus?.sector ? pool.filter((r) => r.sector === focus.sector) : [];
  const sectorHi = sectorPool.length >= MIN_POOL ? sectorPool.reduce((t, r) => t + r.hi, 0) / sectorPool.length : null;
  const maxHi = Math.max(60, ...pool.map((r) => r.hiCi?.[1] ?? r.hi)) * 1.05;
  const nameIndex = new Map(sorted.map((r, i) => [r.workplaceId, i]));
  const sectors = [...new Set(all.map((r) => r.sector).filter((x): x is string => !!x))].sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comparativo entre clientes</h1>
        <p className="max-w-3xl text-sm text-gray-500">
          Evaluación más reciente de cada centro de trabajo con 5 o más respuestas. Las categorías se comparan con un índice 0–5 (cada punto es un nivel de la norma) para poner en la misma escala la Guía II y la Guía III.
          {anonymous && " Los demás centros se muestran de forma anónima."}
        </p>
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4">
        <div><label className="label">Guía</label>
          <select name="guia" defaultValue={guia} className="input w-48"><option value="">Todas</option><option value="GUIA_II">Guía II</option><option value="GUIA_III">Guía III</option></select></div>
        <div><label className="label">Giro o sector</label>
          <select name="sector" defaultValue={sector} className="input w-56"><option value="">Todos</option>{(sectors.length ? sectors : SECTORS).map((x) => <option key={x}>{x}</option>)}</select></div>
        <div><label className="label">Centro a analizar</label>
          <select name="centro" defaultValue={focusId} className="input w-72">{visible.map((r) => <option key={r.workplaceId} value={r.workplaceId}>{r.company} · {r.workplace}</option>)}</select></div>
        <button className="btn-primary">Aplicar</button>
        <span className="ml-auto text-sm text-gray-500">{pool.length} centros · {pool.reduce((t, r) => t + r.n, 0)} trabajadores evaluados</span>
      </form>

      {!enough ? (
        <div className="card p-8 text-center text-gray-600">Se necesitan al menos {MIN_POOL} centros de trabajo con evaluación para construir el comparativo{sector || guia ? " con estos filtros" : ""}. Hoy hay {pool.length}.</div>
      ) : (
        <>
          {focus && <Position focus={focus} pool={pool} metrics={metrics} name={`${focus.company} · ${focus.workplace}`} sectorName={focus.sector} sectorPool={sectorPool} />}

          <section className="card p-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div><h2 className="text-base font-semibold">Ranking por trabajadores en nivel alto o muy alto</h2>
                <p className="text-xs text-gray-500">Barra: % de trabajadores con calificación final alta o muy alta; línea: margen de error al 95%; color: nivel de la calificación final promedio.</p></div>
              <div className="flex gap-4 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 bg-gray-800" />Promedio del portafolio {f1(meanHi)}%</span>
                {sectorHi !== null && <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 border-l-2 border-dashed border-brand-600" />Promedio {focus?.sector} {f1(sectorHi)}%</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              {sorted.map((r) => {
                const i = nameIndex.get(r.workplaceId)!;
                const mine = own.has(r.workplaceId);
                const isFocus = r.workplaceId === focusId;
                const lo = r.hiCi?.[0] ?? r.hi, up = r.hiCi?.[1] ?? r.hi;
                const row = (
                  <>
                    <span className={`truncate text-sm ${isFocus ? "font-semibold text-ink" : mine ? "text-ink" : "text-gray-500"}`}>{label(r, i)}</span>
                    <span className="relative block h-5">
                      <span className="absolute inset-y-0 left-0 rounded-r" style={{ width: `${(r.hi / maxHi) * 100}%`, background: LV[r.finalLevel][0], opacity: mine || !anonymous ? 1 : 0.45, outline: isFocus ? "2px solid var(--ink)" : undefined }} />
                      <span className="absolute top-1/2 h-px -translate-y-1/2 bg-gray-800" style={{ left: `${(lo / maxHi) * 100}%`, width: `${((up - lo) / maxHi) * 100}%` }} />
                      <span className="absolute inset-y-[-3px] w-0.5 bg-gray-800" style={{ left: `${(meanHi / maxHi) * 100}%` }} />
                      {sectorHi !== null && <span className="absolute inset-y-[-3px] border-l-2 border-dashed border-brand-600" style={{ left: `${(sectorHi / maxHi) * 100}%` }} />}
                    </span>
                    <span className="text-right text-sm tabular-nums"><b className="text-ink">{f1(r.hi)}%</b> {(mine || !anonymous) && <span className="text-xs text-gray-500">n={r.n} · {r.guide === "GUIA_III" ? "G-III" : "G-II"}</span>}</span>
                  </>
                );
                return mine ? (
                  <Link key={r.workplaceId} href={`/admin/comparativo?${new URLSearchParams({ ...(guia && { guia }), ...(sector && { sector }), centro: r.workplaceId })}`}
                    className="grid grid-cols-[minmax(0,16rem)_1fr_8rem] items-center gap-3 rounded px-1 py-0.5 hover:bg-gray-50">{row}</Link>
                ) : <div key={r.workplaceId} className="grid grid-cols-[minmax(0,16rem)_1fr_8rem] items-center gap-3 px-1 py-0.5">{row}</div>;
              })}
            </div>
          </section>

          <section className="card overflow-x-auto p-5">
            <h2 className="text-base font-semibold">Mapa de calor del portafolio</h2>
            <p className="mb-3 text-xs text-gray-500">Categorías: índice 0–5 coloreado por nivel. Indicadores: valor coloreado por su semáforo.</p>
            <table className="w-full min-w-[980px] border-separate border-spacing-0.5 text-xs">
              <thead><tr>
                <th className="th sticky left-0 bg-surface">Centro</th><th className="th text-right">Alto+</th>
                {CATEGORY_ORDER.map((c) => <th key={c} className="th text-center normal-case tracking-normal">{SHORT_CAT[c]}</th>)}
                {BENCH_KPIS.map((k) => <th key={k} className="th text-center normal-case tracking-normal" title={pool.find((r) => r.kpis[k])?.kpis[k].name}>{pool.find((r) => r.kpis[k])?.kpis[k].short ?? k}</th>)}
              </tr></thead>
              <tbody>
                {(anonymous ? sorted.filter((r) => own.has(r.workplaceId)) : sorted).map((r) => {
                  const i = nameIndex.get(r.workplaceId)!;
                  return (
                    <tr key={r.workplaceId}>
                      <td className={`sticky left-0 bg-surface px-2 py-1 ${r.workplaceId === focusId ? "font-semibold text-ink" : "text-gray-700"}`}>{label(r, i)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{f1(r.hi)}%</td>
                      {CATEGORY_ORDER.map((c) => {
                        const v = r.categories[c];
                        if (!v) return <td key={c} className="rounded bg-gray-100 px-1 py-1 text-center text-gray-400">n/a</td>;
                        const l = levelOfIndex(v.idx);
                        return <td key={c} className="rounded px-1 py-1 text-center font-semibold tabular-nums" style={{ background: LV[l][0], color: LV[l][1] }} title={`${c}: ${LEVEL_LABEL[l]}`}>{f1(v.idx)}</td>;
                      })}
                      {BENCH_KPIS.map((k) => {
                        const v = r.kpis[k];
                        return <td key={k} className="rounded px-1 py-1 text-center font-semibold tabular-nums" style={{ background: LIGHT[v?.light ?? "SIN_DATOS"][0], color: LIGHT[v?.light ?? "SIN_DATOS"][1] }}>{v?.display ?? "—"}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500">n/a: la categoría Entorno organizacional solo existe en la Guía III.{anonymous && " Por confidencialidad, solo se muestran tus centros; el resto del portafolio aparece como referencia en la posición y el ranking."}</p>
          </section>
        </>
      )}
    </div>
  );
}

/* Posición del centro frente al portafolio: rango, cuartiles, mediana y el centro marcado */
function Position({ focus, pool, metrics, name, sectorName, sectorPool }: { focus: BenchRow; pool: BenchRow[]; metrics: Metric[]; name: string; sectorName: string | null; sectorPool: BenchRow[] }) {
  const rows = metrics.flatMap((m) => {
    const vals = pool.map(m.get).filter((v): v is number => v !== null && Number.isFinite(v));
    const v = m.get(focus);
    if (v === null || vals.length < MIN_POOL) return [];
    const q = quantiles(vals);
    const sect = sectorPool.length >= MIN_POOL ? quantiles(sectorPool.map(m.get).filter((x): x is number => x !== null)).mean : null;
    const worseShare = vals.filter((x) => (m.better === "low" ? x > v : x < v)).length / (vals.length - 1 || 1);
    const ratio = q.mean ? v / q.mean : null;
    const lo = Math.min(q.min, v), hi = Math.max(q.max, v), span = hi - lo || 1;
    const pos = (x: number) => `${((x - lo) / span) * 100}%`;
    const bad = m.better === "low" ? v > q.p75 : v < q.p25;
    const good = m.better === "low" ? v < q.p25 : v > q.p75;
    return [{ m, v, q, sect, worseShare, ratio, pos, bad, good }];
  });
  const worst = rows.filter((r) => r.bad).sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));
  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold">Posición de {name}</h2>
      <p className="mb-1 text-xs text-gray-500">Contra {pool.length} centros del portafolio{sectorName && sectorPool.length >= MIN_POOL ? ` (${sectorPool.length} del sector ${sectorName})` : ""}. Barra gris: rango; bloque: cuartil 2–3; raya: mediana; punto: este centro.</p>
      {worst.length > 0 && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          Por encima del 75% del portafolio en: {worst.slice(0, 4).map((r) => `${r.m.label.replace(/ \(índice 0–5\)/, "").replace(/^\w\w-\d\d · /, "")}${r.ratio && r.m.better === "low" ? ` (${f1(r.ratio)} veces el promedio)` : ""}`).join("; ")}.
        </p>
      )}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.m.key} className="grid grid-cols-[minmax(0,17rem)_1fr_10rem] items-center gap-3 text-sm">
            <span className="truncate text-gray-700" title={r.m.label}>{r.m.label}</span>
            <span className="relative block h-5">
              <span className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded bg-gray-200" />
              <span className="absolute top-1/2 h-3 -translate-y-1/2 rounded-sm bg-gray-300" style={{ left: r.pos(r.q.p25), width: `calc(${r.pos(r.q.p75)} - ${r.pos(r.q.p25)})` }} />
              <span className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-gray-700" style={{ left: r.pos(r.q.med) }} />
              {r.sect !== null && <span className="absolute top-1/2 h-4 -translate-y-1/2 border-l-2 border-dashed border-brand-600" style={{ left: r.pos(r.sect) }} title={`Promedio del sector ${r.m.fmt(r.sect)}`} />}
              <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2" style={{ left: r.pos(r.v), background: r.bad ? "var(--lv-muyalto)" : r.good ? "var(--lv-bajo)" : "var(--lv-medio)", borderColor: "var(--surface)" }} />
            </span>
            <span className="text-right tabular-nums"><b className="text-ink">{r.m.fmt(r.v)}</b> <span className="text-xs text-gray-500">mediana {r.m.fmt(r.q.med)}</span></span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "var(--lv-bajo)" }} />Mejor que el 75% del portafolio</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "var(--lv-medio)" }} />En el rango central</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "var(--lv-muyalto)" }} />Peor que el 75% del portafolio</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 border-l-2 border-dashed border-brand-600" />Promedio del sector</span>
      </div>
    </section>
  );
}
