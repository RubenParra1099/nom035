"use client";
import { useMemo, useState } from "react";
import { ANSWERS } from "@/lib/nom035/guides";
import { G1_SECTIONS } from "@/lib/nom035/guia1";
import { DEMO_QUESTIONS, PHYSICAL_ITEMS, PHYSICAL_OPTIONS } from "@/lib/nom035/demographics";
import { submitSurvey } from "./actions";

type Section = { title: string; filter?: "clientes" | "jefe"; items: { n: number; text: string }[] };
type Props = {
  token: string; company: string; workplace: string; guide: "GUIA_II" | "GUIA_III";
  includeGuideI: boolean; departments: string[]; positions: string[]; sections: Section[];
};
type Step =
  | { kind: "intro" } | { kind: "demo" } | { kind: "physical" }
  | { kind: "g1"; part: number } | { kind: "section"; idx: number } | { kind: "final" };

const G1_OFFSET = [0, 6, 8, 15];

export default function Survey(p: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [consent, setConsent] = useState(false);
  const [demo, setDemo] = useState<Record<string, string | null>>({});
  const [phys, setPhys] = useState<Record<string, string | null>>({});
  const [g1, setG1] = useState<(boolean | null)[]>(Array(20).fill(null));
  const [items, setItems] = useState<Record<number, number | null>>({});
  const [servesClients, setServesClients] = useState<boolean | null>(null);
  const [isBoss, setIsBoss] = useState<boolean | null>(null);
  const [contactName, setContactName] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const g1Event = g1.slice(0, 6).some((x) => x === true);
  const steps: Step[] = useMemo(() => {
    const s: Step[] = [{ kind: "intro" }, { kind: "demo" }, { kind: "physical" }];
    if (p.includeGuideI) {
      s.push({ kind: "g1", part: 0 });
      if (g1Event) s.push({ kind: "g1", part: 1 }, { kind: "g1", part: 2 }, { kind: "g1", part: 3 });
    }
    p.sections.forEach((_, idx) => s.push({ kind: "section", idx }));
    s.push({ kind: "final" });
    return s;
  }, [p.includeGuideI, p.sections, g1Event]);
  const step = steps[stepIdx];

  const demoQs = DEMO_QUESTIONS.map((q) => ({
    ...q,
    options: q.fromEvaluation ? (q.fromEvaluation === "departments" ? p.departments : p.positions) : q.options ?? [],
  })).filter((q) => q.options.length > 0);

  function validate(): string | null {
    if (step.kind === "intro" && !consent) return "Para continuar acepte el aviso de confidencialidad.";
    if (step.kind === "demo") { const miss = demoQs.find((q) => !demo[q.key]); if (miss) return `Seleccione: ${miss.label}.`; }
    if (step.kind === "physical" && PHYSICAL_ITEMS.some((k) => !phys[k])) return "Califique todas las condiciones físicas.";
    if (step.kind === "g1") {
      const n = G1_SECTIONS[step.part].items.length;
      for (let i = 0; i < n; i++) if (g1[G1_OFFSET[step.part] + i] === null) return "Responda Sí o No a cada pregunta.";
    }
    if (step.kind === "section") {
      const sec = p.sections[step.idx];
      if (sec.filter === "clientes" && servesClients === null) return "Indique si atiende clientes o usuarios.";
      if (sec.filter === "jefe" && isBoss === null) return "Indique si es jefe de otros trabajadores.";
      const active = (sec.filter === "clientes" && !servesClients) || (sec.filter === "jefe" && !isBoss) ? [] : sec.items;
      const miss = active.find((it) => items[it.n] === undefined || items[it.n] === null);
      if (miss) return `Falta responder la pregunta ${miss.n}.`;
    }
    return null;
  }

  function next() {
    const e = validate();
    setError(e);
    if (e) return;
    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
    window.scrollTo({ top: 0 });
  }
  function back() { setError(null); setStepIdx((i) => Math.max(0, i - 1)); window.scrollTo({ top: 0 }); }

  async function send() {
    setSending(true); setError(null);
    const res = await submitSurvey(p.token, {
      demographics: demo, physical: phys, items, servesClients, isBoss,
      g1: g1Event ? g1 : g1.map((v, i) => (i < 6 ? v : null)),
      contactName: contactName || null, comment: comment || null,
    });
    setSending(false);
    if ("error" in res && res.error) setError(res.error);
    else setDone(true);
  }

  if (done) {
    return (
      <Shell {...p} progress={100}>
        <div className="py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">✓</div>
          <h2 className="text-xl font-semibold">¡Gracias por su participación!</h2>
          <p className="mt-2 text-gray-600">Sus respuestas se registraron de forma confidencial. Ya puede cerrar esta ventana.</p>
        </div>
      </Shell>
    );
  }

  const progress = Math.round((stepIdx / (steps.length - 1)) * 100);
  return (
    <Shell {...p} progress={progress}>
      {step.kind === "intro" && (
        <div className="space-y-4 text-[15px] leading-relaxed text-gray-700">
          <h2 className="text-xl font-semibold text-gray-900">Cuestionario de factores de riesgo psicosocial</h2>
          <p>Este cuestionario forma parte de la evaluación que establece la <b>NOM-035-STPS-2018</b>. Su objetivo es identificar
            las condiciones de trabajo que pueden afectar su bienestar, para mejorar el entorno laboral.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>No hay respuestas correctas o incorrectas: conteste según su experiencia.</li>
            <li>Sus respuestas son <b>confidenciales</b> y los resultados se presentan de forma agrupada.</li>
            <li>Toma aproximadamente {p.guide === "GUIA_III" ? "20" : "12"} minutos.</li>
          </ul>
          <label className="flex items-start gap-3 rounded-lg bg-brand-50 p-3">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>He leído la información anterior y acepto participar de forma voluntaria.</span>
          </label>
        </div>
      )}

      {step.kind === "demo" && (
        <div className="space-y-5">
          <SectionTitle title="Datos generales" subtitle="Se usan solo para presentar resultados por grupo." />
          {demoQs.map((q) => (
            <div key={q.key}>
              <div className="label">{q.label}</div>
              {q.options.length <= 6 ? (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((o) => (
                    <Chip key={o} active={demo[q.key] === o} onClick={() => setDemo({ ...demo, [q.key]: o })}>{o}</Chip>
                  ))}
                </div>
              ) : (
                <select className="input" value={demo[q.key] ?? ""} onChange={(e) => setDemo({ ...demo, [q.key]: e.target.value || null })}>
                  <option value="">Seleccione…</option>
                  {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>
      )}

      {step.kind === "physical" && (
        <div className="space-y-5">
          <SectionTitle title="Condiciones físicas de su lugar de trabajo" subtitle="¿Cómo califica las siguientes condiciones?" />
          {PHYSICAL_ITEMS.map((k) => (
            <div key={k}>
              <div className="label">{k === "Higiene" ? "Higiene en oficinas, baños y comedor" : k}</div>
              <div className="flex flex-wrap gap-2">
                {PHYSICAL_OPTIONS.map((o) => <Chip key={o} active={phys[k] === o} onClick={() => setPhys({ ...phys, [k]: o })}>{o}</Chip>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {step.kind === "g1" && (
        <div className="space-y-4">
          <SectionTitle title={`Guía I · ${G1_SECTIONS[step.part].title}`} subtitle={G1_SECTIONS[step.part].prompt || "Durante el último mes:"} />
          {G1_SECTIONS[step.part].items.map((q, i) => {
            const idx = G1_OFFSET[step.part] + i;
            return (
              <YesNo key={idx} label={q} value={g1[idx]} onChange={(v) => { const a = [...g1]; a[idx] = v; setG1(a); }} />
            );
          })}
        </div>
      )}

      {step.kind === "section" && (() => {
        const sec = p.sections[step.idx];
        const filterVal = sec.filter === "clientes" ? servesClients : sec.filter === "jefe" ? isBoss : true;
        return (
          <div className="space-y-4">
            {sec.filter === "clientes" && <YesNo label="En mi trabajo debo brindar servicio a clientes o usuarios" value={servesClients} onChange={setServesClients} />}
            {sec.filter === "jefe" && <YesNo label="Soy jefe de otros trabajadores" value={isBoss} onChange={setIsBoss} />}
            {filterVal === true && (
              <>
                <SectionTitle title={sec.title} subtitle="Seleccione la opción que mejor describa su situación." />
                {sec.items.map((it) => (
                  <div key={it.n} className="rounded-xl border border-gray-200 p-4">
                    <p className="mb-3 font-medium text-gray-900"><span className="text-gray-400">{it.n}.</span> {it.text}</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {ANSWERS.map((a, idx) => (
                        <Chip key={a} active={items[it.n] === idx} onClick={() => setItems({ ...items, [it.n]: idx })}>{a}</Chip>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })()}

      {step.kind === "final" && (
        <div className="space-y-5">
          <SectionTitle title="Para terminar" subtitle="Estas preguntas son opcionales." />
          <div>
            <label className="label">Si desea recibir atención y ayuda especializada de manera CONFIDENCIAL, escriba su nombre</label>
            <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Opcional" maxLength={200} />
            <p className="mt-1 text-xs text-gray-500">Solo el personal responsable de la evaluación podrá verlo. No se mostrará en los resultados.</p>
          </div>
          <div>
            <label className="label">¿Desea expresar algo adicional?</label>
            <textarea className="input" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} />
          </div>
        </div>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-between gap-3">
        {stepIdx > 0 ? <button className="btn-secondary" onClick={back}>Atrás</button> : <span />}
        {step.kind === "final"
          ? <button className="btn-primary" onClick={send} disabled={sending}>{sending ? "Enviando…" : "Enviar respuestas"}</button>
          : <button className="btn-primary" onClick={next}>Continuar</button>}
      </div>
    </Shell>
  );
}

function Shell({ company, workplace, progress, children }: { company: string; workplace: string; progress: number; children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">NOM-035-STPS-2018</div>
        <div className="text-sm text-gray-600">{company} · {workplace}</div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200"><div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="card p-5 sm:p-6">{children}</div>
    </main>
  );
}
function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div><h2 className="text-lg font-semibold text-gray-900">{title}</h2>{subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}</div>;
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`rounded-lg border px-3 py-2.5 text-sm transition ${active ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300 bg-surface text-gray-800 hover:border-brand-600"}`}>
      {children}
    </button>
  );
}
function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="mb-3 font-medium text-gray-900">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <Chip active={value === true} onClick={() => onChange(true)}>Sí</Chip>
        <Chip active={value === false} onClick={() => onChange(false)}>No</Chip>
      </div>
    </div>
  );
}
