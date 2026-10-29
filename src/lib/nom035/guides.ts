import { G3_SECTIONS, G3_TEXT } from "./texts";

export type GuideId = "GUIA_II" | "GUIA_III";
export type Level = "NULO" | "BAJO" | "MEDIO" | "ALTO" | "MUY_ALTO";
export const LEVELS: Level[] = ["NULO", "BAJO", "MEDIO", "ALTO", "MUY_ALTO"];
export const LEVEL_LABEL: Record<Level, string> = {
  NULO: "Nulo o despreciable",
  BAJO: "Bajo",
  MEDIO: "Medio",
  ALTO: "Alto",
  MUY_ALTO: "Muy alto",
};
/** Criterios para la toma de acciones (Tabla 4 de las Guías II y III). */
export const LEVEL_ACTION: Record<Level, string> = {
  NULO: "El riesgo resulta despreciable por lo que no se requiere medidas adicionales.",
  BAJO: "Es necesario una mayor difusión de la política de prevención de riesgos psicosociales y programas para: la prevención de los factores de riesgo psicosocial, la promoción de un entorno organizacional favorable y la prevención de la violencia laboral.",
  MEDIO: "Se requiere revisar la política de prevención de riesgos psicosociales y programas para la prevención de los factores de riesgo psicosocial, la promoción de un entorno organizacional favorable y la prevención de la violencia laboral, así como reforzar su aplicación y difusión, mediante un Programa de intervención.",
  ALTO: "Se requiere realizar un análisis de cada categoría y dominio, de manera que se puedan determinar las acciones de intervención apropiadas a través de un Programa de intervención, que podrá incluir una evaluación específica y deberá incluir una campaña de sensibilización, revisar la política de prevención de riesgos psicosociales y programas para la prevención de los factores de riesgo psicosocial, la promoción de un entorno organizacional favorable y la prevención de la violencia laboral, así como reforzar su aplicación y difusión.",
  MUY_ALTO: "Se requiere realizar el análisis de cada categoría y dominio para establecer las acciones de intervención apropiadas, mediante un Programa de intervención que deberá incluir evaluaciones específicas, y contemplar campañas de sensibilización, revisar la política de prevención de riesgos psicosociales y programas para la prevención de los factores de riesgo psicosocial, la promoción de un entorno organizacional favorable y la prevención de la violencia laboral, así como reforzar su aplicación y difusión.",
};

export const ANSWERS = ["Siempre", "Casi siempre", "Algunas veces", "Casi nunca", "Nunca"] as const;
export type Answer = (typeof ANSWERS)[number];

/** Cortes: límite inferior de BAJO, MEDIO, ALTO y MUY ALTO (NULO es < primer corte). */
type Cuts = [number, number, number, number];

export interface GuideDef {
  id: GuideId;
  name: string;
  items: number;
  /** Reactivos donde Siempre = 0 … Nunca = 4. */
  inverse: Set<number>;
  domains: Record<string, number[]>;
  categories: Record<string, string[]>;
  finalCuts: Cuts;
  categoryCuts: Record<string, Cuts>;
  domainCuts: Record<string, Cuts>;
  /** Reactivos condicionados por los filtros. */
  clientItems: number[];
  bossItems: number[];
  text: (n: number) => string;
  sections: { title: string; items: number[]; filter?: "clientes" | "jefe" }[];
}

export const D = {
  COND: "Condiciones en el ambiente de trabajo",
  CARGA: "Carga de trabajo",
  CONTROL: "Falta de control sobre el trabajo",
  JORNADA: "Jornada de trabajo",
  INTERF: "Interferencia en la relación trabajo-familia",
  LIDER: "Liderazgo",
  REL: "Relaciones en el trabajo",
  VIOL: "Violencia",
  RECON: "Reconocimiento del desempeño",
  PERT: "Insuficiente sentido de pertenencia e inestabilidad",
} as const;
export const C = {
  AMB: "Ambiente de trabajo",
  FACT: "Factores propios de la actividad",
  ORG: "Organización del tiempo de trabajo",
  LYR: "Liderazgo y relaciones en el trabajo",
  ENT: "Entorno organizacional",
} as const;

export const GUIA_III: GuideDef = {
  id: "GUIA_III",
  name: "Guía de Referencia III (72 reactivos)",
  items: 72,
  inverse: new Set([1, 4, 23, 24, 25, 26, 27, 28, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 55, 56, 57]),
  domains: {
    [D.COND]: [1, 2, 3, 4, 5],
    [D.CARGA]: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 65, 66, 67, 68],
    [D.CONTROL]: [23, 24, 25, 26, 27, 28, 29, 30, 35, 36],
    [D.JORNADA]: [17, 18],
    [D.INTERF]: [19, 20, 21, 22],
    [D.LIDER]: [31, 32, 33, 34, 37, 38, 39, 40, 41],
    [D.REL]: [42, 43, 44, 45, 46, 69, 70, 71, 72],
    [D.VIOL]: [57, 58, 59, 60, 61, 62, 63, 64],
    [D.RECON]: [47, 48, 49, 50, 51, 52],
    [D.PERT]: [53, 54, 55, 56],
  },
  categories: {
    [C.AMB]: [D.COND],
    [C.FACT]: [D.CARGA, D.CONTROL],
    [C.ORG]: [D.JORNADA, D.INTERF],
    [C.LYR]: [D.LIDER, D.REL, D.VIOL],
    [C.ENT]: [D.RECON, D.PERT],
  },
  finalCuts: [50, 75, 99, 140],
  categoryCuts: {
    [C.AMB]: [5, 9, 11, 14],
    [C.FACT]: [15, 30, 45, 60],
    [C.ORG]: [5, 7, 10, 13],
    [C.LYR]: [14, 29, 42, 58],
    [C.ENT]: [10, 14, 18, 23],
  },
  domainCuts: {
    [D.COND]: [5, 9, 11, 14],
    [D.CARGA]: [15, 21, 27, 37],
    [D.CONTROL]: [11, 16, 21, 25],
    [D.JORNADA]: [1, 2, 4, 6],
    [D.INTERF]: [4, 6, 8, 10],
    [D.LIDER]: [9, 12, 16, 20],
    [D.REL]: [10, 13, 17, 21],
    [D.VIOL]: [7, 10, 13, 16],
    [D.RECON]: [6, 10, 14, 18],
    [D.PERT]: [4, 6, 8, 10],
  },
  clientItems: [65, 66, 67, 68],
  bossItems: [69, 70, 71, 72],
  text: (n) => G3_TEXT[n],
  sections: G3_SECTIONS,
};

/** Guía II → reactivo equivalente en Guía III (mismo texto). */
export const G2_TO_G3: Record<number, number> = {
  1: 2, 2: 3, 3: 5, 4: 6, 5: 7, 6: 8, 7: 9, 8: 10, 9: 12, 10: 13, 11: 14, 12: 15, 13: 16, 14: 17, 15: 18,
  16: 19, 17: 21, 18: 23, 19: 24, 20: 25, 21: 27, 22: 28, 23: 31, 24: 32, 25: 34, 26: 35, 27: 36, 28: 38,
  29: 41, 30: 42, 31: 45, 32: 46, 33: 57, 34: 58, 35: 59, 36: 60, 37: 61, 38: 62, 39: 63, 40: 64,
  41: 65, 42: 66, 43: 67, 44: 69, 45: 70, 46: 72,
};
export const G3_TO_G2: Record<number, number> = Object.fromEntries(
  Object.entries(G2_TO_G3).map(([a, b]) => [b, Number(a)]),
);

export const GUIA_II: GuideDef = {
  id: "GUIA_II",
  name: "Guía de Referencia II (46 reactivos)",
  items: 46,
  inverse: new Set([18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33]),
  domains: {
    [D.COND]: [1, 2, 3],
    [D.CARGA]: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 41, 42, 43],
    [D.CONTROL]: [18, 19, 20, 21, 22, 26, 27],
    [D.JORNADA]: [14, 15],
    [D.INTERF]: [16, 17],
    [D.LIDER]: [23, 24, 25, 28, 29],
    [D.REL]: [30, 31, 32, 44, 45, 46],
    [D.VIOL]: [33, 34, 35, 36, 37, 38, 39, 40],
  },
  categories: {
    [C.AMB]: [D.COND],
    [C.FACT]: [D.CARGA, D.CONTROL],
    [C.ORG]: [D.JORNADA, D.INTERF],
    [C.LYR]: [D.LIDER, D.REL, D.VIOL],
  },
  finalCuts: [20, 45, 70, 90],
  categoryCuts: {
    [C.AMB]: [3, 5, 7, 9],
    [C.FACT]: [10, 20, 30, 40],
    [C.ORG]: [4, 6, 9, 12],
    [C.LYR]: [10, 18, 28, 38],
  },
  domainCuts: {
    [D.COND]: [3, 5, 7, 9],
    [D.CARGA]: [12, 16, 20, 24],
    [D.CONTROL]: [5, 8, 11, 14],
    [D.JORNADA]: [1, 2, 4, 6],
    [D.INTERF]: [1, 2, 4, 6],
    [D.LIDER]: [3, 5, 8, 11],
    [D.REL]: [5, 8, 11, 14],
    [D.VIOL]: [7, 10, 13, 16],
  },
  clientItems: [41, 42, 43],
  bossItems: [44, 45, 46],
  text: (n) => G3_TEXT[G2_TO_G3[n]],
  sections: G3_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((n) => G3_TO_G2[n]).map((n) => G3_TO_G2[n]),
  })).filter((s) => s.items.length > 0),
};

export const GUIDES: Record<GuideId, GuideDef> = { GUIA_II, GUIA_III };

export function levelFor(score: number, cuts: Cuts): Level {
  let i = 0;
  for (const c of cuts) if (score >= c) i++;
  return LEVELS[i];
}

/** Itemizado para la tabla de criterios. */
export function itemsOfDomain(g: GuideDef) {
  const map: Record<number, { domain: string; category: string }> = {};
  for (const [cat, doms] of Object.entries(g.categories))
    for (const d of doms) for (const n of g.domains[d]) map[n] = { domain: d, category: cat };
  return map;
}
