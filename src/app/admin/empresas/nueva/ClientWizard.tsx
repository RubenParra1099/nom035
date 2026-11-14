"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import QRCode from "qrcode";
import Help from "@/components/ui/Help";
import ChipsInput from "@/components/ui/ChipsInput";
import { toast } from "@/components/ui/forms";
import AreasTable, { cleanAreas, parsePasted, type AreaRow } from "@/components/structure/AreasTable";
import { guideLabel } from "@/lib/nom035/guideLabel";
import { requiredGuide, sampleSize } from "@/lib/nom035/score";
import { SECTORS } from "@/lib/sectors";
import { createClient, type WizardResult } from "../../estructura-actions";

const POSITIONS = ["Operativo", "Profesional o Técnico", "Auxiliar / Asistente", "Supervisor", "Coordinador", "Gerente"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
type Centro = { key: number; name: string; address: string; total: string; rows: AreaRow[]; evaluate: boolean; guide: "" | "GUIA_II" | "GUIA_III" };
const blank = (key: number): Centro => ({ key, name: "", address: "", total: "", rows: [{ key: 0, name: "", count: "" }], evaluate: true, guide: "" });
const num = (v: string) => Math.max(0, parseInt(v || "0", 10) || 0);

const STEPS = [
  ["Empresa", "Datos y giro"], ["Centros y plantilla", "Dónde y cuántos"], ["Primera evaluación", "Guía y puestos"], ["Listo", "Enlace y QR"],
] as const;

export default function ClientWizard() {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState({ name: "", rfc: "", contact: "", sector: "" });
  const [centros, setCentros] = useState<Centro[]>([blank(1)]);
  const [openKey, setOpenKey] = useState(1);
  const [paste, setPaste] = useState<string | null>(null);
  const now = new Date();
  const [ev, setEv] = useState({ name: `Evaluación ${MONTHS[now.getMonth()]} ${now.getFullYear()}`, includeGuideI: true, positions: POSITIONS, open: true });
  const [result, setResult] = useState<WizardResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const upd = (key: number, patch: Partial<Centro>) => setCentros((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const valid = centros.filter((c) => c.name.trim().length >= 2 && num(c.total) > 0);
  const totals = useMemo(() => ({
    trab: valid.reduce((t, c) => t + num(c.total), 0),
    areas: valid.reduce((t, c) => t + cleanAreas(c.rows).length, 0),
    cuest: valid.filter((c) => c.evaluate).reduce((t, c) => { const g = c.guide || requiredGuide(num(c.total)) || "GUIA_II"; const n = num(c.total); return t + (g === "GUIA_III" && n > 50 ? sampleSize(n) : n); }, 0),
  }), [valid]);
  const can = [company.name.trim().length >= 2, valid.length > 0 && valid.length === centros.filter((c) => c.name.trim() || c.total).length, true, true];

  function applyPaste(text: string) {
    const rows = parsePasted(text);
    if (!rows.length) return;
    if (rows.some((r) => r.centro)) {
      const groups = new Map<string, { name: string; areas: AreaRow[] }>();
      rows.forEach((r, i) => {
        const k = (r.centro ?? "Centro").toLowerCase();
        if (!groups.has(k)) groups.set(k, { name: r.centro ?? "Centro", areas: [] });
        groups.get(k)!.areas.push({ key: i, name: r.area, count: r.n == null ? "" : String(r.n) });
      });
      setCentros((cs) => {
        const base = cs.filter((c) => c.name.trim() || c.total);
        let k = Math.max(0, ...cs.map((c) => c.key));
        for (const g of groups.values()) {
          const sum = g.areas.reduce((t, a) => t + num(a.count), 0);
          const ex = base.find((c) => c.name.trim().toLowerCase() === g.name.toLowerCase());
          if (ex) Object.assign(ex, { rows: g.areas, total: String(sum || num(ex.total)) });
          else base.push({ ...blank(++k), name: g.name, total: sum ? String(sum) : "", rows: g.areas });
        }
        setOpenKey(base[0]?.key ?? 1);
        return [...base];
      });
    } else {
      const c = centros.find((x) => x.key === openKey) ?? centros[0];
      const areas = rows.map((r, i) => ({ key: i, name: r.area, count: r.n == null ? "" : String(r.n) }));
      const sum = areas.reduce((t, a) => t + num(a.count), 0);
      upd(c.key, { rows: areas, total: c.total || (sum ? String(sum) : "") });
    }
    setPaste(null);
    toast(`${rows.length} áreas pegadas`);
  }

  function submit() {
    setError(null);
    start(async () => {
      try {
        const r = await createClient({
          company: { name: company.name, rfc: company.rfc || undefined, contact: company.contact || undefined, sector: company.sector || undefined },
          centros: valid.map((c) => ({ name: c.name.trim(), address: c.address.trim() || null, headcount: num(c.total), areas: cleanAreas(c.rows), evaluate: c.evaluate, guide: c.guide || undefined })),
          evaluation: ev,
        });
        setResult(r); setStep(3);
      } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear el cliente."); }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav aria-label="Ruta" className="text-sm text-gray-500"><Link href="/admin" className="hover:text-gray-900">Empresas</Link> › Nuevo cliente</nav>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">Nuevo cliente<Help id="wizard" /></h1>
        </div>
        {step < 3 && <Link href="/admin" className="btn-secondary">Cancelar</Link>}
      </div>

      <ol className="card flex flex-wrap gap-x-2 gap-y-3 p-4" aria-label="Pasos">
        {STEPS.map(([t, d], i) => {
          const done = i < step, on = i === step;
          return (
            <li key={t} className="flex min-w-[10rem] flex-1 items-center gap-2.5">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-green-600 text-white" : on ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500"}`}>{done ? "✓" : i + 1}</span>
              <span className="leading-tight"><span className={`block text-sm font-semibold ${on ? "text-brand-700" : "text-ink"}`}>{t}</span><span className="block text-xs text-gray-500">{d}</span></span>
              {i < 3 && <span className="mx-1 hidden h-0.5 flex-1 bg-gray-200 lg:block" />}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="card p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="flex items-center gap-1.5 text-lg font-semibold text-ink">Datos de la empresa<Help id="wz.empresa" /></h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2"><label className="label" htmlFor="cname">Razón social / nombre</label><input id="cname" className="input" autoFocus value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} placeholder="Ej. Constructora del Norte SA de CV" /></div>
                <div><label className="label" htmlFor="rfc">RFC</label><input id="rfc" className="input" value={company.rfc} onChange={(e) => setCompany({ ...company, rfc: e.target.value.toUpperCase() })} /></div>
                <div><label className="label" htmlFor="sector">Giro o sector</label><select id="sector" className="input" value={company.sector} onChange={(e) => setCompany({ ...company, sector: e.target.value })}><option value="">Sin especificar</option>{SECTORS.map((x) => <option key={x}>{x}</option>)}</select></div>
                <div className="md:col-span-2"><label className="label" htmlFor="contact">Contacto</label><input id="contact" className="input" value={company.contact} onChange={(e) => setCompany({ ...company, contact: e.target.value })} placeholder="Nombre, correo o teléfono" /></div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="flex items-center gap-1.5 text-lg font-semibold text-ink">Centros de trabajo de {company.name || "la empresa"}<Help id="wz.centros" /></h2>
                  <p className="text-sm text-gray-500">La NOM-035 se aplica por centro. Agregue cada planta, oficina o sucursal con sus áreas.</p></div>
                <button type="button" className="btn-secondary" onClick={() => setPaste(paste === null ? "" : null)}>⬆ Pegar desde Excel</button>
              </div>
              {paste !== null && (
                <div className="space-y-2 rounded-xl border border-brand-600/40 bg-brand-50/50 p-4">
                  <p className="text-sm text-ink">Copie en Excel las columnas <b>Centro · Área · Trabajadores</b> (o solo <b>Área · Trabajadores</b> para el centro abierto) y péguelas:</p>
                  <textarea className="input h-36 font-mono text-xs" autoFocus value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"Planta Monterrey\tProducción\t120\nPlanta Monterrey\tAlmacén\t35\nOficinas CDMX\tAdministración\t22"} />
                  <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setPaste(null)}>Cancelar</button><button type="button" className="btn-primary" onClick={() => applyPaste(paste)}>Agregar {parsePasted(paste).length || ""} áreas</button></div>
                </div>
              )}
              <div className="overflow-hidden rounded-xl border border-line">
                {centros.map((c, idx) => {
                  const open = c.key === openKey, n = num(c.total), areas = cleanAreas(c.rows);
                  const sum = areas.reduce((t, a) => t + (a.headcount ?? 0), 0);
                  return (
                    <div key={c.key} className={idx ? "border-t border-line" : ""}>
                      {!open ? (
                        <button type="button" onClick={() => setOpenKey(c.key)} className="flex w-full flex-wrap items-center gap-3 bg-surface-2 px-4 py-3 text-left hover:bg-brand-50/50">
                          <span aria-hidden>▸</span><b className="text-ink">{c.name || "Centro sin nombre"}</b><span className="text-sm text-gray-500">{c.address}</span>
                          <span className="ml-auto text-sm">{n} trab.</span>
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">{guideLabel(n)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${areas.length && sum === n ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{areas.length} áreas · {sum}/{n}{areas.length && sum === n ? " ✓" : ""}</span>
                        </button>
                      ) : (
                        <div className="space-y-3 p-4">
                          <div className="grid gap-3 md:grid-cols-[1fr_1fr_8rem_auto] md:items-end">
                            <div><label className="label">Centro de trabajo</label><input className="input font-semibold" value={c.name} onChange={(e) => upd(c.key, { name: e.target.value })} placeholder="Ej. Planta Monterrey" /></div>
                            <div><label className="label">Domicilio</label><input className="input" value={c.address} onChange={(e) => upd(c.key, { address: e.target.value })} /></div>
                            <div><label className="label">Trabajadores</label><input type="number" min={0} className="input text-right" value={c.total} onChange={(e) => upd(c.key, { total: e.target.value })} /></div>
                            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-center text-xs font-semibold text-brand-700 md:mb-2">{guideLabel(n)}</span>
                          </div>
                          <AreasTable rows={c.rows} setRows={(f) => setCentros((cs) => cs.map((x) => (x.key === c.key ? { ...x, rows: f(x.rows) } : x)))} total={n} onUseSum={(s) => upd(c.key, { total: String(s) })} compact />
                          {centros.length > 1 && <button type="button" className="text-xs font-medium text-red-600 hover:underline" onClick={() => { setCentros((cs) => cs.filter((x) => x.key !== c.key)); setOpenKey(centros.find((x) => x.key !== c.key)!.key); }}>Quitar este centro</button>}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="border-t border-line px-4 py-3">
                  <button type="button" className="text-sm font-medium text-brand-700 hover:underline" onClick={() => { const k = Math.max(...centros.map((c) => c.key)) + 1; setCentros([...centros, blank(k)]); setOpenKey(k); }}>+ Agregar otro centro de trabajo</button>
                </div>
              </div>
              {!can[1] && centros.some((c) => c.name || c.total) && <p className="text-xs text-amber-700">Cada centro necesita nombre y número de trabajadores.</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="flex items-center gap-1.5 text-lg font-semibold text-ink">Primera evaluación<Help id="wz.evaluacion" /></h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="label">Nombre de la evaluación</label><input className="input" value={ev.name} onChange={(e) => setEv({ ...ev, name: e.target.value })} /></div>
                <div className="space-y-2 pt-6 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={ev.includeGuideI} onChange={(e) => setEv({ ...ev, includeGuideI: e.target.checked })} /> Incluir Guía I (acontecimientos traumáticos severos)</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={ev.open} onChange={(e) => setEv({ ...ev, open: e.target.checked })} /> Abrir la captura de inmediato</label>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-surface-2"><tr><th className="th">Crear</th><th className="th">Centro</th><th className="th text-right">Trabajadores</th><th className="th">Áreas</th><th className="th">Cuestionario</th><th className="th text-right">Meta</th></tr></thead>
                  <tbody>{valid.map((c) => {
                    const n = num(c.total), rec = requiredGuide(n) ?? "GUIA_II", g = c.guide || rec;
                    return (
                      <tr key={c.key} className="border-t border-line">
                        <td className="td"><input type="checkbox" aria-label={`Crear evaluación en ${c.name}`} checked={c.evaluate} onChange={(e) => upd(c.key, { evaluate: e.target.checked })} /></td>
                        <td className="td font-medium text-ink">{c.name}</td>
                        <td className="td text-right tabular-nums">{n}</td>
                        <td className="td">{cleanAreas(c.rows).length}</td>
                        <td className="td"><select className="input py-1" value={g} disabled={!c.evaluate} onChange={(e) => upd(c.key, { guide: e.target.value as Centro["guide"] })}>
                          <option value="GUIA_II">Guía II · 46{rec === "GUIA_II" ? " (recomendada)" : ""}</option><option value="GUIA_III">Guía III · 72{rec === "GUIA_III" ? " (recomendada)" : ""}</option></select></td>
                        <td className="td text-right font-semibold tabular-nums text-brand-700">{c.evaluate ? (g === "GUIA_III" && n > 50 ? sampleSize(n) : n) : "—"}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              <div><label className="label">Tipos de puesto</label><ChipsInput name="positions" initial={ev.positions} suggestions={POSITIONS} placeholder="Ej. Operativo, Supervisor" suggestLabel="Puestos estándar sin agregar:" onChange={(p) => setEv((x) => ({ ...x, positions: p }))} /></div>
              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            </div>
          )}

          {step === 3 && result && <Done result={result} />}

          {step < 3 && (
            <div className="mt-6 flex justify-between gap-2 border-t border-line pt-5">
              {step > 0 ? <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)}>← {STEPS[step - 1][0]}</button> : <span />}
              {step < 2
                ? <button type="button" className="btn-primary" disabled={!can[step]} onClick={() => setStep(step + 1)}>Continuar: {STEPS[step + 1][0].toLowerCase()} →</button>
                : <button type="button" className="btn-primary" disabled={pending} onClick={submit}>{pending ? "Creando…" : "Crear cliente"}</button>}
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink">Resumen del cliente</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {([["Empresa", company.name || "—"], ["Giro", company.sector || "—"], ["Centros", valid.length], ["Trabajadores", totals.trab], ["Áreas", totals.areas], ["Cuestionarios a aplicar", totals.cuest]] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-gray-500">{k}</dt><dd className={`text-right font-semibold ${k === "Cuestionarios a aplicar" ? "text-brand-700" : "text-ink"}`}>{v}</dd></div>
              ))}
            </dl>
          </div>
          <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-900"><b>¿Qué guía aplica?</b><br />Hasta 15 trabajadores: solo Guía I · 16 a 50: Guía II a todos · más de 50: Guía III a una muestra. Se calcula sola por centro.</div>
        </aside>
      </div>
    </div>
  );
}

function Done({ result }: { result: WizardResult }) {
  const [origin, setOrigin] = useState("");
  const [qrs, setQrs] = useState<Record<string, string>>({});
  useEffect(() => {
    const o = window.location.origin; setOrigin(o);
    Promise.all(result.evaluations.map(async (e) => [e.id, await QRCode.toDataURL(`${o}/e/${e.token}`, { margin: 1, width: 160 })] as const)).then((xs) => setQrs(Object.fromEntries(xs)));
  }, [result]);
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-green-50 p-4 text-green-800 dark:bg-green-950/30"><b>✓ Cliente creado.</b> {result.evaluations.length ? "Comparta el enlace o el código QR de cada evaluación con el personal." : "Cree las evaluaciones cuando esté listo desde la pestaña Estructura."}</div>
      <div className="grid gap-3 md:grid-cols-2">
        {result.evaluations.map((e) => {
          const url = `${origin}/e/${e.token}`;
          return (
            <div key={e.id} className="flex gap-3 rounded-xl border border-line p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qrs[e.id] ? <img src={qrs[e.id]} alt={`Código QR de ${e.centro}`} className="h-28 w-28 rounded border border-line" /> : <div className="h-28 w-28 rounded bg-surface-2" />}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="font-semibold text-ink">{e.centro}</div>
                <div className="text-xs text-gray-500">{e.name} · {e.guide === "GUIA_III" ? "Guía III" : "Guía II"}</div>
                <div className="truncate rounded bg-surface-2 px-2 py-1 font-mono text-[11px] text-gray-600">{url}</div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => { navigator.clipboard?.writeText(url); toast("Enlace copiado"); }}>Copiar enlace</button>
                  <Link href={`/admin/evaluaciones/${e.id}`} className="btn-secondary px-2.5 py-1 text-xs">Abrir evaluación</Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end"><Link href={`/admin/empresas/${result.companyId}?tab=resumen&creado=1`} className="btn-primary">Ir a la empresa →</Link></div>
    </div>
  );
}
