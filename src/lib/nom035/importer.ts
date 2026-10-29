import { G3_TO_G2, GuideId } from "./guides";
import { answerIndex } from "./score";
import { parseYesNo } from "./guia1";

export interface NormalizedResponse {
  submittedAt: Date | null;
  demographics: Record<string, string | null>;
  physical: Record<string, string | null>;
  items: Record<number, number | null>;
  servesClients: boolean | null;
  isBoss: boolean | null;
  g1: (boolean | null)[];
  contactName: string | null;
  comment: string | null;
}

export const DEMOGRAPHIC_FIELDS: { key: string; label: string; match: RegExp }[] = [
  { key: "sexo", label: "Sexo", match: /^sexo$/i },
  { key: "edad", label: "Edad", match: /^edad$/i },
  { key: "estadoCivil", label: "Estado civil", match: /^estado civil$/i },
  { key: "departamento", label: "Departamento / Área", match: /departamento|área|area/i },
  { key: "puesto", label: "Tipo de puesto", match: /tipo de puesto/i },
  { key: "contratacion", label: "Tipo de contratación", match: /contrataci/i },
  { key: "jornada", label: "Tipo de jornada", match: /tipo de jornada/i },
  { key: "rotacion", label: "Rotación de turnos", match: /rotaci[oó]n de turnos/i },
  { key: "tiempoPuesto", label: "Tiempo en el puesto", match: /tiempo en el puesto/i },
  { key: "experiencia", label: "Experiencia laboral", match: /experiencia laboral/i },
];
export const PHYSICAL_FIELDS = ["Temperatura", "Humedad", "Iluminación", "Ventilación", "Higiene", "Ruido"];
export const EDUCATION_LEVELS = [
  "Sin Formación", "Primaria", "Secundaria", "Preparatoria o Bachillerato", "Técnico Superior", "Licenciatura", "Maestría", "Doctorado",
];

const G1_KEYS = [
  /accidente que tenga/i, /asaltos/i, /actos violentos/i, /secuestro/i, /amenazas/i, /cualquier otro que ponga/i,
  /recuerdos recurrentes/i, /sueños de carácter/i, /evitar todo tipo de sentimientos/i, /evitar todo tipo de actividades/i,
  /dificultad para recordar/i, /disminuido su interés/i, /alejado o distante/i, /dificultad para expresar/i,
  /vida se va a acortar/i, /dificultades para dormir/i, /irritable/i, /dificultad para concentrarse/i,
  /nervioso o constantemente/i, /sobresaltado/i,
];

function parseDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 86400 * 1000)); // serial Excel
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/);
  if (m) {
    // Google Forms exporta d/m/aaaa en locale es-MX; si el primer número > 12 es inequívoco
    let [d, mo] = [Number(m[1]), Number(m[2])];
    if (mo > 12) [d, mo] = [mo, d];
    return new Date(Number(m[3]), mo - 1, d, Number(m[4]), Number(m[5]), Number(m[6] ?? 0));
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t);
}

/** Detecta la guía a partir de los números de reactivo en los encabezados "[n.- texto]". */
export function detectGuide(header: unknown[]): { guide: GuideId; itemCols: Record<number, number>; numbering: "G3" | "G2" } {
  const cols: Record<number, number> = {};
  header.forEach((h, i) => {
    const m = String(h ?? "").match(/\[(\d+)\.-/);
    if (m) cols[Number(m[1])] = i;
  });
  const nums = Object.keys(cols).map(Number);
  // Reactivos exclusivos de Guía III: 1, 4, 11, 20, 22, 26, 29, 30, 33, 37, 39, 40, 43, 44, 47-56, 68, 71
  const g3Only = [1, 4, 11, 20, 22, 26, 29, 30, 33, 37, 39, 40, 43, 44, 47, 53, 68, 71];
  const hasG3 = g3Only.filter((n) => nums.includes(n)).length >= 5;
  const maxN = Math.max(0, ...nums);
  if (hasG3) return { guide: "GUIA_III", itemCols: cols, numbering: "G3" };
  if (maxN > 46) {
    // Formulario de Guía II numerado con los reactivos de la Guía III (caso MADRE 46)
    const mapped: Record<number, number> = {};
    for (const [n3, col] of Object.entries(cols)) if (G3_TO_G2[Number(n3)]) mapped[G3_TO_G2[Number(n3)]] = col;
    return { guide: "GUIA_II", itemCols: mapped, numbering: "G3" };
  }
  return { guide: "GUIA_II", itemCols: cols, numbering: "G2" };
}

export function normalizeSheet(rows: unknown[][]) {
  const header = rows[0].map((h) => String(h ?? "").trim());
  const { guide, itemCols, numbering } = detectGuide(header);
  const find = (re: RegExp) => header.findIndex((h) => re.test(h));
  const demoCols = DEMOGRAPHIC_FIELDS.map((f) => ({ ...f, col: header.findIndex((h) => f.match.test(h) && !/\[/.test(h)) }));
  const eduCols = EDUCATION_LEVELS.map((lvl) => ({ lvl, col: header.findIndex((h) => h.includes(`Nivel de Estudios [${lvl}]`)) }));
  const physCols = PHYSICAL_FIELDS.map((p) => ({ p, col: header.findIndex((h) => /factores f[ií]sicos/i.test(h) && h.includes(p)) }));
  const tsCol = find(/marca temporal|timestamp/i);
  const clientsCol = find(/brindar servicio a clientes/i);
  const bossCol = find(/soy jefe de otros/i);
  const contactCol = find(/ESCRIBIR SU NOMBRE/i);
  const commentCol = find(/si desea expresar algo adicional/i);
  const g1Cols = G1_KEYS.map((re) => header.findIndex((h) => re.test(h)));

  const responses: NormalizedResponse[] = [];
  for (const r of rows.slice(1)) {
    if (!r || r.every((v) => v === null || v === undefined || v === "")) continue;
    const cell = (c: number) => (c >= 0 && r[c] !== undefined && r[c] !== null && String(r[c]).trim() !== "" ? String(r[c]).trim() : null);
    const items: Record<number, number | null> = {};
    for (const [n, col] of Object.entries(itemCols)) items[Number(n)] = answerIndex(r[col]);
    if (Object.values(items).every((v) => v === null)) continue; // fila sin cuestionario
    // Nivel de estudios: el más alto marcado como "Terminada" (o "Incompleta" si no hay terminada)
    let estudios: string | null = null;
    for (const { lvl, col } of eduCols) {
      const v = cell(col);
      if (v) estudios = v.toLowerCase().startsWith("incomp") ? `${lvl} (incompleta)` : lvl;
    }
    const contact = cell(contactCol);
    responses.push({
      submittedAt: parseDate(tsCol >= 0 ? r[tsCol] : null),
      demographics: {
        ...Object.fromEntries(demoCols.map((f) => [f.key, cell(f.col)])),
        estudios,
      },
      physical: Object.fromEntries(physCols.map(({ p, col }) => [p, cell(col)])),
      items,
      servesClients: parseYesNo(cell(clientsCol)),
      isBoss: parseYesNo(cell(bossCol)),
      g1: g1Cols.map((c) => parseYesNo(cell(c))),
      contactName: contact && !/^(no|n\/a|-|ninguno|no deseo)$/i.test(contact) ? contact : null,
      comment: cell(commentCol),
    });
  }
  return { guide, numbering, responses, columnsFound: Object.keys(itemCols).length };
}
