import { ANSWERS, GUIDES, type GuideId } from "./guides";
import { G1_SECTIONS } from "./guia1";
import { DEMO_QUESTIONS, PHYSICAL_ITEMS, PHYSICAL_OPTIONS } from "./demographics";

const PHYS_LABEL: Record<string, string> = {
  Temperatura: "Temperatura en mi lugar de trabajo", Humedad: "Humedad en mi lugar de trabajo",
  Iluminación: "Iluminación en mi lugar de trabajo", Ventilación: "Ventilación en mi lugar de trabajo",
  Higiene: "Higiene en oficinas, baños y comedor", Ruido: "Ruido en mi lugar de trabajo",
};
const DEMO_HEADER: Record<string, string> = {
  sexo: "Sexo", edad: "Edad", estadoCivil: "Estado Civil", estudios: "Nivel de estudios",
  departamento: "Departamento / Sección / Área", puesto: "Tipo de Puesto", contratacion: "Tipo de Contratación",
  jornada: "Tipo de Jornada de Trabajo", rotacion: "¿Realiza Rotación de Turnos?",
  tiempoPuesto: "Tiempo en el Puesto Actual", experiencia: "Tiempo Experiencia Laboral",
};

/**
 * Plantilla de captura en Excel (un renglón por trabajador). Los encabezados usan el mismo formato que
 * Google Forms ("[n.- texto]"), así que el importador la reconoce sin configuración.
 */
export function buildTemplate(guide: GuideId, opts: { departments: string[]; positions: string[]; includeGuideI: boolean }) {
  const g = GUIDES[guide];
  const header: string[] = ["Marca temporal"];
  const allowed: [string, string][] = [["Marca temporal", "Fecha de captura (opcional), p. ej. 15/11/2026"]];

  for (const q of DEMO_QUESTIONS) {
    const h = DEMO_HEADER[q.key];
    header.push(h);
    const opt = q.fromEvaluation ? (q.fromEvaluation === "departments" ? opts.departments : opts.positions) : q.options ?? [];
    allowed.push([h, opt.length ? opt.join(" | ") : "Texto libre"]);
  }
  for (const k of PHYSICAL_ITEMS) {
    const h = `Factores Físicos [${PHYS_LABEL[k]}]`;
    header.push(h);
    allowed.push([h, PHYSICAL_OPTIONS.join(" | ")]);
  }
  if (opts.includeGuideI) {
    for (const s of G1_SECTIONS) for (const it of s.items) {
      const h = `Guía I [${it}]`;
      header.push(h);
      allowed.push([h, s.key === "I" ? "Sí | No" : "Sí | No (dejar vacío si en la sección I todo fue No)"]);
    }
  }
  const answerList = ANSWERS.join(" | ");
  for (const sec of g.sections) {
    if (sec.filter === "clientes") {
      header.push("En mi trabajo debo brindar servicio a clientes o usuarios:");
      allowed.push(["En mi trabajo debo brindar servicio a clientes o usuarios:", "Sí | No"]);
    }
    if (sec.filter === "jefe") {
      header.push("Soy jefe de otros trabajadores");
      allowed.push(["Soy jefe de otros trabajadores", "Sí | No"]);
    }
    for (const n of sec.items) {
      const h = `[${n}.- ${g.text(n)}]`;
      header.push(h);
      allowed.push([h, sec.filter ? `${answerList} (vacío si el filtro es No)` : answerList]);
    }
  }
  const contact = "Atención confidencial: ESCRIBIR SU NOMBRE (opcional)";
  const comment = "Si desea expresar algo adicional (opcional)";
  header.push(contact, comment);
  allowed.push([contact, "Texto libre"], [comment, "Texto libre"]);

  const instructions: string[][] = [
    [`Plantilla de captura NOM-035 · ${g.name}`],
    [""],
    ["1. Capture un renglón por trabajador en la hoja \"Captura\". No cambie ni mueva los encabezados."],
    ["2. Escriba las respuestas exactamente como aparecen en la columna \"Valores permitidos\" (mayúsculas y acentos no importan)."],
    ["3. Si el trabajador responde \"No\" a atender clientes o a ser jefe, deje vacías esas preguntas."],
    ["4. Guía I: si todas las respuestas de la sección I son \"No\", deje vacías las demás preguntas de la Guía I."],
    ["5. Guarde el archivo y súbalo en la evaluación, en \"Importar respuestas\"."],
    [""],
    ["Columna", "Valores permitidos"],
    ...allowed,
  ];
  return { header, instructions };
}
