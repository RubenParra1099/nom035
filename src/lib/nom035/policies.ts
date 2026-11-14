import { D, GUIDES, levelFor, type GuideId, type Level } from "./guides";
import type { ScoreResult } from "./score";
import type { Kpi } from "./kpis";

/**
 * Catálogo de políticas de mejora alineadas a la NOM-035-STPS-2018 y motor de recomendación.
 * Numerales: 5.1 política · 5.4 medidas · 5.5 acontecimientos traumáticos · 5.6 exámenes · 5.7 difusión · 5.8 registros ·
 * 8.1 medidas de prevención (a apoyo social, b quejas, c pertenencia) · 8.2 acciones por tema (a liderazgo y relaciones,
 * b cargas, c control, d apoyo social, e trabajo-familia, f reconocimiento, g violencia, h información y comunicación,
 * i capacitación) · 8.3–8.4 programa de intervención · 8.5 niveles de intervención.
 */
export type PolicyType = "Política" | "Procedimiento" | "Programa" | "Capacitación" | "Atención";
export type Horizon = "0–3 meses" | "3–6 meses" | "6–12 meses";
export type Policy = {
  id: string; title: string; type: PolicyType; level: 1 | 2 | 3; numeral: string;
  domains: string[]; kpis: string[]; horizon: Horizon; effort: "Bajo" | "Medio" | "Alto";
  /** Para qué sirve, en una frase. */
  purpose: string;
  /** Compromiso redactado para incluirse en la política de prevención (numeral 5.1). */
  commitment: string;
  actions: string[];
};

export const POLICIES: Policy[] = [
  /* ---------- Transversales (obligaciones) ---------- */
  { id: "POL-PREV", title: "Política de prevención de riesgos psicosociales", type: "Política", level: 1, numeral: "5.1 · 5.7", domains: [], kpis: [], horizon: "0–3 meses", effort: "Bajo",
    purpose: "Establecer por escrito el compromiso de la dirección con la prevención de los factores de riesgo psicosocial, la violencia laboral y el entorno organizacional favorable.",
    commitment: "La dirección establece, implanta, mantiene y difunde esta política de prevención de riesgos psicosociales en todo el centro de trabajo.",
    actions: ["Redactar y firmar la política por la dirección.", "Difundirla a todo el personal (inducción, tableros, intranet, recibo de nómina) y conservar evidencia.", "Revisarla al menos una vez al año o tras cada evaluación."] },
  { id: "POL-QUEJAS", title: "Mecanismo seguro y confidencial de quejas", type: "Procedimiento", level: 1, numeral: "8.1 b) · 8.2 g)", domains: [D.VIOL], kpis: ["EI-06", "EI-07"], horizon: "0–3 meses", effort: "Bajo",
    purpose: "Recibir y atender quejas por prácticas opuestas al entorno favorable y actos de violencia laboral sin represalias.",
    commitment: "Contamos con un mecanismo seguro y confidencial para recibir quejas por prácticas opuestas al entorno organizacional favorable y por actos de violencia laboral, que se atienden sin represalias.",
    actions: ["Habilitar al menos dos canales (buzón físico y digital o correo confidencial).", "Definir quién recibe, plazos de respuesta (máximo 30 días) e investigación imparcial.", "Registrar cada queja en la plataforma y medir el tiempo de cierre."] },
  { id: "POL-ATS", title: "Canalización y seguimiento de acontecimientos traumáticos severos", type: "Atención", level: 3, numeral: "5.5 · 5.6 · 8.5", domains: [], kpis: ["EI-08", "EI-09"], horizon: "0–3 meses", effort: "Medio",
    purpose: "Que toda persona identificada por la Guía I reciba valoración clínica oportuna.",
    commitment: "Identificamos a los trabajadores que fueron sujetos a acontecimientos traumáticos severos durante o con motivo del trabajo y los canalizamos para su atención.",
    actions: ["Canalizar cada caso a la institución de seguridad social o al servicio médico en menos de 15 días.", "Dar seguimiento confidencial hasta su atención y registrar el cierre.", "Practicar exámenes médicos y evaluaciones psicológicas cuando existan signos o síntomas."] },
  { id: "POL-SEGUIMIENTO", title: "Programa de intervención con evaluación posterior", type: "Programa", level: 1, numeral: "8.3 · 8.4 · 5.8", domains: [], kpis: ["EI-10", "EI-01", "EI-02", "EI-03"], horizon: "3–6 meses", effort: "Medio",
    purpose: "Convertir los resultados en un programa con áreas, acciones, fechas, responsables, control de avance y evaluación posterior.",
    commitment: "Cuando los resultados lo requieren, elaboramos un programa de intervención con áreas, acciones, fechas, responsables, control de avances y evaluación posterior, y conservamos sus registros.",
    actions: ["Registrar cada acción en el Programa de intervención con responsable y fecha.", "Revisar el avance cada mes con la dirección.", "Volver a evaluar al cierre del programa para medir el cambio."] },
  { id: "CAP-NOM035", title: "Sensibilización en NOM-035 para todo el personal", type: "Capacitación", level: 2, numeral: "5.7 · 8.2 i)", domains: [], kpis: ["EI-05", "EI-04"], horizon: "0–3 meses", effort: "Bajo",
    purpose: "Que el personal conozca la política, los riesgos psicosociales, sus efectos y cómo pedir apoyo.",
    commitment: "Informamos a los trabajadores sobre la política, las medidas adoptadas y los posibles daños a la salud por la exposición a los factores de riesgo psicosocial.",
    actions: ["Sesión de 60 minutos por área con evaluación antes y después.", "Priorizar las áreas con mayor % en riesgo alto.", "Registrar asistencia y calificaciones en Capacitación."] },

  /* ---------- Por dominio ---------- */
  { id: "AMB-01", title: "Condiciones seguras del ambiente de trabajo", type: "Programa", level: 1, numeral: "7.2 · 8.1", domains: [D.COND], kpis: [], horizon: "0–3 meses", effort: "Medio",
    purpose: "Corregir condiciones peligrosas, inseguras o deficientes que generan estrés.",
    commitment: "Mantenemos condiciones de trabajo seguras y verificamos periódicamente iluminación, ruido, temperatura, orden y limpieza.",
    actions: ["Recorrido con la comisión de seguridad e higiene y plan de atención de hallazgos.", "Revisar análisis de riesgos por puesto y equipo de protección.", "Canal para reportar condiciones inseguras con respuesta en 15 días."] },
  { id: "CAR-01", title: "Gestión de cargas de trabajo y plantilla", type: "Programa", level: 1, numeral: "8.2 b)", domains: [D.CARGA], kpis: ["CC-01", "CC-05"], horizon: "3–6 meses", effort: "Alto",
    purpose: "Equilibrar volumen, ritmo y exigencias de cada puesto.",
    commitment: "Revisamos y distribuimos las cargas de trabajo para que sean acordes a las capacidades y a la plantilla de cada área.",
    actions: ["Analizar volumen, tiempos y plantilla de las áreas con nivel alto; redistribuir tareas.", "Eliminar tareas duplicadas y fijar prioridades por escrito.", "Pausas programadas en trabajo de alta concentración."] },
  { id: "CAR-02", title: "Protocolo de atención a clientes difíciles", type: "Procedimiento", level: 2, numeral: "8.2 b) · 8.1 a)", domains: [D.CARGA], kpis: [], horizon: "0–3 meses", effort: "Bajo",
    purpose: "Reducir las demandas emocionales en puestos de atención al público.",
    commitment: "Brindamos apoyo y herramientas al personal que atiende a clientes o usuarios en situaciones de conflicto.",
    actions: ["Protocolo de atención y escalamiento al supervisor.", "Taller de manejo de situaciones difíciles.", "Espacio de pausa después de incidentes."] },
  { id: "CTL-01", title: "Autonomía y participación en decisiones", type: "Política", level: 1, numeral: "8.2 c)", domains: [D.CONTROL], kpis: ["CC-04"], horizon: "3–6 meses", effort: "Medio",
    purpose: "Dar margen de decisión sobre el orden, ritmo y forma de hacer el trabajo.",
    commitment: "Fomentamos la participación de los trabajadores en las decisiones sobre la organización de su trabajo y los informamos antes de cambios.",
    actions: ["Definir qué decisiones puede tomar cada puesto.", "Consultar al personal antes de cambios de proceso, turno o estructura.", "Reuniones mensuales de mejora por área."] },
  { id: "CTL-02", title: "Plan anual de capacitación y desarrollo", type: "Capacitación", level: 2, numeral: "8.2 i) · 8.2 c)", domains: [D.CONTROL], kpis: ["EO-04"], horizon: "6–12 meses", effort: "Medio",
    purpose: "Cerrar brechas de capacitación y ofrecer rutas de crecimiento.",
    commitment: "Proporcionamos capacitación acorde a las funciones de cada puesto y oportunidades de desarrollo.",
    actions: ["Detectar necesidades de capacitación por puesto.", "Programa anual con evaluación de aprendizaje.", "Criterios de promoción transparentes."] },
  { id: "JOR-01", title: "Control de jornada, horas extra y descansos", type: "Política", level: 1, numeral: "7.2 · 8.2 e)", domains: [D.JORNADA], kpis: ["CC-02", "CC-06"], horizon: "0–3 meses", effort: "Medio",
    purpose: "Evitar jornadas que excedan lo previsto en la Ley Federal del Trabajo y rotaciones bruscas.",
    commitment: "Respetamos los límites de jornada, los descansos y las vacaciones, y planeamos la rotación de turnos para proteger la salud.",
    actions: ["Límite de horas extra por persona y reporte mensual por área.", "Programar coberturas para descansos y vacaciones.", "Revisar rotación de turnos y jornadas nocturnas prolongadas."] },
  { id: "FAM-01", title: "Equilibrio trabajo-familia y desconexión", type: "Política", level: 1, numeral: "8.2 e)", domains: [D.INTERF], kpis: ["CC-03", "CC-05"], horizon: "0–3 meses", effort: "Bajo",
    purpose: "Reducir la interferencia del trabajo en la vida personal y familiar.",
    commitment: "Promovemos el equilibrio trabajo-familia: respetamos la desconexión fuera de la jornada y facilitamos permisos para responsabilidades familiares.",
    actions: ["Política de desconexión (sin mensajes ni llamadas fuera de horario, salvo emergencias).", "Flexibilidad de horario o permisos cuando el puesto lo permita.", "Difundir los apoyos disponibles."] },
  { id: "LID-01", title: "Formación de líderes y claridad de funciones", type: "Capacitación", level: 2, numeral: "8.2 a) · 8.2 h)", domains: [D.LIDER], kpis: ["LR-03", "LR-04"], horizon: "3–6 meses", effort: "Medio",
    purpose: "Mejorar la forma de dirigir: claridad, comunicación, retroalimentación y trato justo.",
    commitment: "Formamos a jefes y supervisores en liderazgo respetuoso, comunicación clara y retroalimentación, y aclaramos las funciones de cada puesto.",
    actions: ["Descripciones de puesto y objetivos por escrito.", "Programa de liderazgo para jefes de las áreas con mayor brecha.", "Reuniones periódicas de equipo para informar a tiempo."] },
  { id: "REL-01", title: "Apoyo social y trabajo en equipo", type: "Programa", level: 2, numeral: "8.1 a) · 8.2 d)", domains: [D.REL], kpis: ["LR-06"], horizon: "3–6 meses", effort: "Bajo",
    purpose: "Fortalecer la cooperación y el apoyo entre compañeros y con quien supervisa.",
    commitment: "Impulsamos el apoyo social, la cooperación y el trabajo en equipo, y la resolución respetuosa de conflictos.",
    actions: ["Actividades de integración por área.", "Herramientas para delegar y dar seguimiento a quienes supervisan.", "Canal de mediación de conflictos."] },
  { id: "VIO-01", title: "Prevención y atención de la violencia laboral", type: "Política", level: 2, numeral: "8.2 g) · 8.1 b) · 5.6", domains: [D.VIOL], kpis: ["LR-01", "LR-02", "EI-07"], horizon: "0–3 meses", effort: "Medio",
    purpose: "Erradicar el hostigamiento, el acoso y los malos tratos.",
    commitment: "No toleramos actos de violencia laboral; los investigamos con imparcialidad, protegemos a quien denuncia y aplicamos sanciones.",
    actions: ["Código de conducta con ejemplos de conductas de violencia laboral.", "Investigación imparcial y sin represalias de cada caso.", "Sensibilización a todo el personal; atención psicológica en niveles alto o muy alto."] },
  { id: "REC-01", title: "Reconocimiento y retroalimentación del desempeño", type: "Programa", level: 1, numeral: "8.2 f)", domains: [D.RECON], kpis: ["LR-05"], horizon: "3–6 meses", effort: "Bajo",
    purpose: "Que el personal sepa cómo va y sienta reconocido su esfuerzo.",
    commitment: "Reconocemos el desempeño y damos retroalimentación periódica con criterios claros y equitativos.",
    actions: ["Retroalimentación trimestral con criterios claros.", "Programa de reconocimiento no solo económico.", "Revisar puntualidad del pago y equidad salarial."] },
  { id: "PER-01", title: "Sentido de pertenencia y estabilidad", type: "Programa", level: 1, numeral: "8.1 c) · 8.2 h)", domains: [D.PERT], kpis: ["EO-02", "EO-03", "EO-05"], horizon: "3–6 meses", effort: "Medio",
    purpose: "Reducir la incertidumbre y fortalecer la identificación con la organización.",
    commitment: "Promovemos el sentido de pertenencia: comunicamos los planes de la organización y fortalecemos la inducción del personal.",
    actions: ["Comunicación periódica de la dirección sobre planes y situación.", "Inducción reforzada para nuevo ingreso.", "Análisis de causas de rotación y entrevistas de salida."] },
];
export const POLICY = Object.fromEntries(POLICIES.map((p) => [p.id, p])) as Record<string, Policy>;

/* ---------------- Motor de recomendación ---------------- */
export type Rec = { d: Record<string, string>; it: (number | null)[] };
export type Recommendation = {
  policy: Policy;
  tier: "Obligatoria" | "Prioridad alta" | "Prioridad media" | "Preventiva";
  score: number;
  /** Por qué se recomienda: hallazgos concretos. */
  evidence: string[];
  domain?: { name: string; level: Level; mean: number; hiPct: number; delta: number | null };
  areas: { name: string; hiPct: number; n: number }[];
  items: { n: number; text: string; unfav: number }[];
  people: number | null;
  kpis: { id: string; short: string; name: string; display: string; light: Kpi["light"]; target: string | null }[];
};
const LV_RANK: Record<Level, number> = { NULO: 0, BAJO: 1, MEDIO: 2, ALTO: 3, MUY_ALTO: 4 };
const LV_TXT: Record<Level, string> = { NULO: "nulo", BAJO: "bajo", MEDIO: "medio", ALTO: "alto", MUY_ALTO: "muy alto" };
const pctOf = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const r0 = (x: number) => Math.round(x);

/** Meta sugerida para un KPI: llegar a verde o mejorar 30% en la siguiente evaluación, lo que sea menos exigente. */
export function kpiTarget(k: Kpi): { value: number; text: string } | null {
  if (k.value == null || k.green == null || !k.dir) return null;
  const pctUnit = k.display.includes("%");
  const fmt = (v: number) => (pctUnit ? `${v.toFixed(0)}%` : v.toFixed(Math.abs(v) < 2 ? 2 : Math.abs(v) < 100 ? 1 : 0));
  if (k.dir === "lower") {
    if (k.value <= k.green) return { value: k.value, text: `Mantener en ${fmt(k.value)} o menos` };
    const t = Math.max(k.green, k.value * 0.7);
    return { value: t, text: `Bajar de ${fmt(k.value)} a ${fmt(t)}` };
  }
  if (k.value >= k.green) return { value: k.value, text: `Mantener en ${fmt(k.value)} o más` };
  const t = Math.min(k.green, k.value + Math.max(5, (k.green - k.value) * 0.6));
  return { value: t, text: `Subir de ${fmt(k.value)} a ${fmt(t)}` };
}

export function recommendPolicies({ guide, records, scores, headcount, kpis, prevDomains, atsRequired, complaints, minGroup = 5 }: {
  guide: GuideId; records: Rec[]; scores: ScoreResult[]; headcount: number; kpis: Kpi[];
  prevDomains?: Record<string, number>; atsRequired: number; complaints: number; minGroup?: number;
}): Recommendation[] {
  const g = GUIDES[guide];
  const n = scores.length;
  if (!n) return [];
  const N = headcount || n;
  const kpiById = Object.fromEntries(kpis.map((k) => [k.id, k]));
  const kpiView = (ids: string[]) => ids.map((id) => kpiById[id]).filter((k) => k && k.value != null)
    .map((k) => ({ id: k.id, short: k.short, name: k.name, display: k.display, light: k.light, target: kpiTarget(k)?.text ?? null }));
  const pts = (it: number, v: number) => (g.inverse.has(it) ? v : 4 - v);
  const fm = scores.reduce((t, s) => t + s.final, 0) / n;
  const finalLevel = levelFor(fm, g.finalCuts);

  // Estadística por dominio
  const domStats = Object.keys(g.domains).map((d) => {
    const mean = scores.reduce((t, s) => t + s.domains[d], 0) / n;
    const lvCounts = scores.filter((s) => LV_RANK[s.domainLevels[d]] >= 3).length;
    return { name: d, mean, hiPct: pctOf(lvCounts, n), level: levelFor(mean, g.domainCuts[d]) };
  });
  // Áreas más afectadas por dominio
  const areasOf = (d: string) => {
    const by = new Map<string, { n: number; hi: number }>();
    records.forEach((r, i) => {
      const a = r.d.departamento; if (!a) return;
      const x = by.get(a) ?? { n: 0, hi: 0 }; x.n++; if (LV_RANK[scores[i].domainLevels[d]] >= 3) x.hi++; by.set(a, x);
    });
    return [...by.entries()].filter(([, x]) => x.n >= minGroup).map(([name, x]) => ({ name, n: x.n, hiPct: pctOf(x.hi, x.n) }))
      .filter((x) => x.hiPct > 0).sort((a, b) => b.hiPct - a.hiPct).slice(0, 3);
  };
  // Reactivos con más respuesta desfavorable dentro del dominio
  const itemsOf = (d: string) => g.domains[d].map((it) => {
    let ans = 0, unf = 0;
    records.forEach((r) => { const v = r.it[it - 1]; if (v == null) return; ans++; if (pts(it, v) >= 3) unf++; });
    return { n: it, text: g.text(it), unfav: pctOf(unf, ans) };
  }).filter((x) => x.unfav > 0).sort((a, b) => b.unfav - a.unfav).slice(0, 3);

  const out: Recommendation[] = [];
  const push = (policy: Policy, tier: Recommendation["tier"], score: number, evidence: string[], extra: Partial<Recommendation> = {}) =>
    out.push({ policy, tier, score, evidence, areas: [], items: [], people: null, kpis: kpiView(policy.kpis), ...extra });

  // Obligaciones transversales
  push(POLICY["POL-PREV"], "Obligatoria", 1000, [
    `Calificación final ${fm.toFixed(1)} · nivel ${LV_TXT[finalLevel]}.`,
    LV_RANK[finalLevel] >= 1 ? "La norma pide mayor difusión de la política de prevención a partir del nivel bajo." : "Mantener la política vigente y su difusión.",
  ]);
  if (atsRequired > 0) push(POLICY["POL-ATS"], "Obligatoria", 990, [`${atsRequired} ${atsRequired === 1 ? "trabajador requiere" : "trabajadores requieren"} valoración clínica según la Guía I.`]);
  if (LV_RANK[finalLevel] >= 2) push(POLICY["POL-SEGUIMIENTO"], "Obligatoria", 980, [`El nivel ${LV_TXT[finalLevel]} obliga a elaborar un programa de intervención (numerales 8.3 y 8.4).`]);
  const viol = domStats.find((x) => x.name === D.VIOL);
  const tevl = kpiById["LR-01"]?.value ?? 0;
  if (complaints === 0 || (viol && LV_RANK[viol.level] >= 2) || tevl > 5)
    push(POLICY["POL-QUEJAS"], LV_RANK[viol?.level ?? "NULO"] >= 2 || tevl > 10 ? "Prioridad alta" : "Obligatoria", 900, [
      complaints === 0 ? "No hay quejas registradas: verifique que el mecanismo exista y sea conocido." : `${complaints} quejas registradas en el centro.`,
      ...(tevl > 5 ? [`${r0(tevl)}% del personal reporta exposición a violencia laboral (TEVL).`] : []),
    ]);

  // Por dominio
  for (const ds of domStats) {
    const pol = POLICIES.filter((p) => p.domains.includes(ds.name) && !p.id.startsWith("POL-"));
    if (!pol.length) continue;
    const rank = LV_RANK[ds.level];
    const delta = prevDomains?.[ds.name] != null ? ds.mean - prevDomains[ds.name] : null;
    const red = pol.some((p) => p.kpis.some((id) => kpiById[id]?.light === "ROJO"));
    if (rank < 2 && ds.hiPct < 20 && !red) continue;
    const people = r0((ds.hiPct / 100) * N);
    const tier: Recommendation["tier"] = rank >= 3 ? "Prioridad alta" : rank === 2 || red ? "Prioridad media" : "Preventiva";
    const areas = areasOf(ds.name), items = itemsOf(ds.name);
    const ev = [
      `${ds.name}: nivel ${LV_TXT[ds.level]} (${ds.mean.toFixed(1)} pts); ${r0(ds.hiPct)}% del personal en alto o muy alto${N ? `, unas ${people} personas` : ""}.`,
      ...(delta != null && Math.abs(delta) >= 0.5 ? [`${delta > 0 ? "Empeoró" : "Mejoró"} ${Math.abs(delta).toFixed(1)} pts contra el periodo anterior.`] : []),
      ...(areas.length ? [`Áreas más afectadas: ${areas.map((a) => `${a.name} (${r0(a.hiPct)}%)`).join(", ")}.`] : []),
      ...(items[0] ? [`Reactivo crítico: “${items[0].text}” (${r0(items[0].unfav)}% desfavorable).`] : []),
    ];
    pol.forEach((p, i) => push(p, tier, rank * 100 + ds.hiPct + (delta && delta > 0 ? 20 : 0) - i * 5 + (red ? 15 : 0), ev,
      { domain: { name: ds.name, level: ds.level, mean: ds.mean, hiPct: ds.hiPct, delta }, areas, items, people }));
  }
  // Capacitación general cuando hay al menos un dominio en medio o más
  if (domStats.some((x) => LV_RANK[x.level] >= 2)) push(POLICY["CAP-NOM035"], "Prioridad media", 300, ["Hay dominios en nivel medio o superior: la sensibilización facilita que las demás acciones funcionen."]);

  // Una sola recomendación por política (la de mayor puntaje)
  const best = new Map<string, Recommendation>();
  for (const r of out) if (!best.has(r.policy.id) || best.get(r.policy.id)!.score < r.score) best.set(r.policy.id, r);
  return [...best.values()].sort((a, b) => b.score - a.score);
}

