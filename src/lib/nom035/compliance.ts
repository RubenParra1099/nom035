import { LEVELS, type GuideId, type Level } from "./guides";
import { sampleSize } from "./score";

/**
 * Índice de cumplimiento NOM-035-STPS-2018 (0–100).
 * Cada obligación se califica como cumplida (1), parcial (0.5), pendiente (0) o no aplica (fuera del cálculo).
 * Las que la plataforma puede comprobar se calculan solas; las demás las marca el consultor.
 */
export type CheckStatus = "ok" | "partial" | "no" | "na";
export type ManualMark = { done: boolean; note?: string; at?: string };
export type ComplianceInput = {
  guide: GuideId; includeGuideI: boolean; headcount: number; n: number; finalLevel: Level | null;
  atsRequired: number; atsCanalized: number;
  actions: { dueDate: string; doneAt: string | null }[];
  complaints: number; trainings: number; reportSaved: boolean;
  manual: Record<string, ManualMark>;
  today?: string;
};
export type CheckResult = {
  id: string; numeral: string; title: string; what: string; status: CheckStatus; detail: string;
  /** auto: la plataforma lo calcula; manual: lo marca el consultor; mixto: se cumple con registros o con la marca manual. */
  source: "auto" | "manual" | "mixto"; mark?: ManualMark;
};

export const STATUS_LABEL: Record<CheckStatus, string> = { ok: "Cumplido", partial: "Parcial", no: "Pendiente", na: "No aplica" };

export function complianceChecks(c: ComplianceInput): { checks: CheckResult[]; index: number | null; counts: Record<CheckStatus, number> } {
  const today = c.today ?? new Date().toISOString().slice(0, 10);
  const small = c.headcount > 0 && c.headcount <= 15;
  const m = (id: string) => c.manual[id];
  const manual = (id: string, numeral: string, title: string, what: string, naIfSmall = false): CheckResult => {
    const mk = m(id);
    if (naIfSmall && small) return { id, numeral, title, what, status: "na", detail: "No aplica a centros de 15 trabajadores o menos.", source: "manual", mark: mk };
    return { id, numeral, title, what, status: mk?.done ? "ok" : "no", detail: mk?.done ? (mk.note || "Marcado como cumplido.") : "Pendiente de confirmar por el consultor.", source: "manual", mark: mk };
  };
  const checks: CheckResult[] = [];

  checks.push(manual("POL", "5.1", "Política de prevención", "Política escrita, firmada por la dirección, implantada y difundida."));

  // 5.2 / 5.3 Identificación y análisis
  if (small) checks.push({ id: "IDENT", numeral: "5.2 · 5.3", title: "Identificación y análisis de factores de riesgo", what: "Aplicación de la Guía II o III a la muestra requerida.", status: "na", detail: "No aplica a centros de 15 trabajadores o menos.", source: "auto" });
  else {
    const req = c.headcount > 0 ? sampleSize(c.headcount) : null;
    const status: CheckStatus = c.n === 0 ? "no" : req === null || c.n >= req ? "ok" : "partial";
    checks.push({ id: "IDENT", numeral: c.guide === "GUIA_III" ? "5.2 · 5.3" : "5.2", title: "Identificación y análisis de factores de riesgo", what: c.guide === "GUIA_III" ? "Guía III (factores de riesgo y entorno organizacional) aplicada a la muestra requerida." : "Guía II aplicada a la muestra requerida.",
      status, detail: req === null ? `${c.n} cuestionarios; falta capturar la plantilla del centro para validar la muestra.` : `${c.n} de ${req} cuestionarios requeridos (plantilla de ${c.headcount}).`, source: "auto" });
  }

  // 5.5 Guía I
  checks.push({ id: "G1", numeral: "5.5", title: "Identificación de acontecimientos traumáticos severos", what: "Guía I aplicada a todo el personal.",
    status: c.includeGuideI ? "ok" : "no", detail: c.includeGuideI ? "La evaluación incluye la Guía I." : "Esta evaluación no incluye la Guía I.", source: "auto" });

  // 5.5 Canalización
  checks.push({ id: "ATS", numeral: "5.5", title: "Canalización de trabajadores con acontecimientos traumáticos", what: "Cada caso que requiere valoración clínica se canaliza a atención.",
    status: !c.includeGuideI || c.atsRequired === 0 ? "na" : c.atsCanalized >= c.atsRequired ? "ok" : c.atsCanalized > 0 ? "partial" : "no",
    detail: !c.includeGuideI ? "Sin Guía I en esta evaluación." : c.atsRequired === 0 ? "Ningún caso requiere valoración clínica." : `${c.atsCanalized} de ${c.atsRequired} casos canalizados.`, source: "auto" });

  // 5.4 / 8.3–8.4 Programa de intervención
  const needsProgram = c.finalLevel !== null && LEVELS.indexOf(c.finalLevel) >= 2;
  const total = c.actions.length;
  const overdue = c.actions.filter((a) => !a.doneAt && a.dueDate < today).length;
  const done = c.actions.filter((a) => a.doneAt).length;
  checks.push({ id: "PROG", numeral: "5.4 · 8.3 · 8.4", title: "Programa de intervención", what: "Acciones con responsable y fecha cuando el nivel es medio o mayor, con seguimiento de avance.",
    status: !needsProgram && total === 0 ? "na" : total === 0 ? "no" : overdue === 0 ? "ok" : "partial",
    detail: !needsProgram && total === 0 ? "El nivel final es bajo o nulo; el programa no es obligatorio." : total === 0 ? "El nivel final es medio o mayor y no hay acciones registradas." : `${total} acciones · ${done} cumplidas · ${overdue} vencidas.`, source: "auto" });

  // 5.6 Exámenes médicos
  checks.push(manual("MED", "5.6", "Exámenes médicos y evaluaciones psicológicas", "Practicarlos a los trabajadores expuestos a violencia laboral o a factores de riesgo cuando haya signos o síntomas.", true));

  // 8.1 b) Quejas
  const qm = m("QUEJAS");
  checks.push({ id: "QUEJAS", numeral: "8.1 b)", title: "Mecanismo de quejas", what: "Medio seguro y confidencial para recibir quejas por prácticas opuestas al entorno favorable y por violencia laboral.",
    status: small ? "na" : qm?.done || c.complaints > 0 ? "ok" : "no",
    detail: small ? "No aplica a centros de 15 trabajadores o menos." : c.complaints > 0 ? `${c.complaints} quejas registradas en la plataforma.` : qm?.done ? (qm.note || "Marcado como cumplido.") : "Sin quejas registradas ni confirmación del mecanismo.", source: "mixto", mark: qm });

  // 5.7 Difusión y capacitación
  const dm = m("DIF");
  checks.push({ id: "DIF", numeral: "5.7 · 8.2 i)", title: "Difusión y capacitación", what: "Informar al personal la política, las medidas adoptadas y los resultados; capacitar a quienes lo requieran.",
    status: dm?.done && c.trainings > 0 ? "ok" : dm?.done || c.trainings > 0 ? "partial" : "no",
    detail: [c.trainings > 0 ? `${c.trainings} capacitaciones registradas` : "Sin capacitaciones registradas", dm?.done ? "difusión confirmada" : "difusión sin confirmar"].join(" · ") + ".", source: "mixto", mark: dm });

  // 5.8 Registros
  checks.push({ id: "REG", numeral: "5.8", title: "Registros e informe de resultados", what: "Informe de la identificación y análisis, medidas adoptadas y trabajadores atendidos.",
    status: c.reportSaved ? "ok" : c.n > 0 ? "partial" : "no",
    detail: c.reportSaved ? "Informe de resultados guardado." : "Resultados en la plataforma; falta completar y guardar el informe.", source: "auto" });

  const counts = { ok: 0, partial: 0, no: 0, na: 0 } as Record<CheckStatus, number>;
  checks.forEach((x) => counts[x.status]++);
  const applicable = checks.length - counts.na;
  const index = applicable ? Math.round(((counts.ok + counts.partial * 0.5) / applicable) * 100) : null;
  return { checks, index, counts };
}

export const MANUAL_IDS = ["POL", "MED", "QUEJAS", "DIF"] as const;
