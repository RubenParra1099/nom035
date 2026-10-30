import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import fs from "node:fs";
import { GUIA_II, GUIA_III } from "@/lib/nom035/guides";
import { scoreWorker, aggregate, sampleSize, itemValue, maskConditional } from "@/lib/nom035/score";
import { evaluateG1 } from "@/lib/nom035/guia1";
import { normalizeSheet } from "@/lib/nom035/importer";

describe("catálogo", () => {
  it("cada reactivo pertenece a exactamente un dominio", () => {
    for (const g of [GUIA_II, GUIA_III]) {
      const all = Object.values(g.domains).flat().sort((a, b) => a - b);
      expect(all).toEqual(Array.from({ length: g.items }, (_, i) => i + 1));
      for (const n of all) expect(g.text(n)).toBeTruthy();
    }
  });
  it("valores directo e inverso", () => {
    expect(itemValue(GUIA_III, 2, 0)).toBe(4); // Siempre, directo
    expect(itemValue(GUIA_III, 1, 0)).toBe(0); // Siempre, inverso
    expect(itemValue(GUIA_III, 1, 4)).toBe(4); // Nunca, inverso
  });
  it("máximos y niveles", () => {
    const all = Object.fromEntries(Array.from({ length: 72 }, (_, i) => [i + 1, GUIA_III.inverse.has(i + 1) ? 4 : 0]));
    const r = scoreWorker("GUIA_III", all);
    expect(r.final).toBe(288);
    expect(r.finalLevel).toBe("MUY_ALTO");
    const zero = Object.fromEntries(Array.from({ length: 46 }, (_, i) => [i + 1, GUIA_II.inverse.has(i + 1) ? 0 : 4]));
    expect(scoreWorker("GUIA_II", zero).finalLevel).toBe("NULO");
  });
  it("frontera exacta pertenece al nivel superior", () => {
    // Guía II final: 20 → BAJO
    const a: Record<number, number> = Object.fromEntries(Array.from({ length: 46 }, (_, i) => [i + 1, GUIA_II.inverse.has(i + 1) ? 0 : 4]));
    for (const n of [1, 2, 3, 4, 5]) a[n] = 0; // 5 directos en Siempre = 20 puntos
    expect(scoreWorker("GUIA_II", a).final).toBe(20);
    expect(scoreWorker("GUIA_II", a).finalLevel).toBe("BAJO");
  });
  it("muestra", () => {
    expect(sampleSize(221)).toBe(141);
    expect(sampleSize(50)).toBe(45);
  });
  it("Guía I", () => {
    const base = Array(20).fill(false);
    expect(evaluateG1(base).event).toBe(false);
    const a = [...base]; a[1] = true; expect(evaluateG1(a)).toEqual({ event: true, requiresEvaluation: false });
    a[6] = true; expect(evaluateG1(a).requiresEvaluation).toBe(true);
    const b = [...base]; b[0] = true; b[8] = b[9] = true; expect(evaluateG1(b).requiresEvaluation).toBe(false);
    b[10] = true; expect(evaluateG1(b).requiresEvaluation).toBe(true);
    const c = [...base]; c[3] = true; c[15] = c[19] = true; expect(evaluateG1(c).requiresEvaluation).toBe(true);
  });
});

// Validación contra datos reales (no se versionan por confidencialidad): NOM035_FIXTURES=/ruta/carpeta
const dir = process.env.NOM035_FIXTURES;
const load = (f: string) => {
  const wb = XLSX.read(fs.readFileSync(`${dir}/${f}`), { sheets: ["RF1"], dense: true });
  return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["RF1"], { header: 1, raw: true });
};
describe.skipIf(!dir)("datos reales", () => {
  it("MADRE 72 = Guía III, 221 resp., final 105.8 Alto (sin aplicar filtros, igual que el Excel)", () => {
    const { guide, responses } = normalizeSheet(load("72.xlsx"));
    expect(guide).toBe("GUIA_III");
    expect(responses.length).toBe(221);
    const agg = aggregate("GUIA_III", responses.map((r) => scoreWorker("GUIA_III", r.items)));
    expect(agg.final.mean).toBeCloseTo(105.78, 1);
    expect(agg.final.level).toBe("ALTO");
    expect(agg.final.distribution).toEqual({ NULO: 5, BAJO: 39, MEDIO: 49, ALTO: 96, MUY_ALTO: 32 });
    // 21 personas contestaron reactivos condicionados aunque el filtro era "No": la norma los excluye → 105.3
    const masked = aggregate("GUIA_III", responses.map((r) => scoreWorker("GUIA_III", maskConditional("GUIA_III", r.items, r.servesClients, r.isBoss))));
    expect(masked.final.mean).toBeCloseTo(105.33, 1);
    const g1 = responses.map((r) => evaluateG1(r.g1));
    expect(g1.filter((x) => x.event).length).toBe(44);
    expect(g1.filter((x) => x.requiresEvaluation).length).toBe(17);
  });
  it("MADRE 46 = Guía II, 50 resp., final 71.7 Alto", () => {
    const { guide, responses } = normalizeSheet(load("46.xlsx"));
    expect(guide).toBe("GUIA_II");
    expect(responses.length).toBe(50);
    const agg = aggregate("GUIA_II", responses.map((r) => scoreWorker("GUIA_II", r.items)));
    expect(agg.final.mean).toBeCloseTo(71.7, 1);
    expect(agg.categories.find((c) => c.name === "Factores propios de la actividad")?.level).toBe("MUY_ALTO");
    expect(responses.map((r) => evaluateG1(r.g1)).filter((x) => x.requiresEvaluation).length).toBe(6);
  });
});

import { buildTemplate } from "@/lib/nom035/template";
describe("plantilla de captura", () => {
  for (const guide of ["GUIA_II", "GUIA_III"] as const) {
    it(`${guide}: la plantilla llenada se importa y califica`, () => {
      const g = guide === "GUIA_II" ? GUIA_II : GUIA_III;
      const { header } = buildTemplate(guide, { departments: ["Operación"], positions: ["Operativo"], includeGuideI: true });
      const row = header.map((h) => {
        if (/^\[\d+\.-/.test(h)) return "Casi siempre";
        if (/clientes o usuarios:|Soy jefe/.test(h)) return "No";
        if (h.startsWith("Guía I [")) return h.includes("Asaltos") ? "Sí" : h.includes("dormir") || h.includes("irritable") ? "Sí" : "No";
        if (h === "Sexo") return "Mujer";
        if (h === "Nivel de estudios") return "Licenciatura";
        if (h.startsWith("Departamento")) return "Operación";
        if (h.startsWith("Factores Físicos")) return "Bien";
        if (h.includes("ESCRIBIR SU NOMBRE")) return "Ana";
        return null;
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, row]), "Captura");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      const rows = XLSX.utils.sheet_to_json<unknown[]>(XLSX.read(buf).Sheets["Captura"], { header: 1, raw: true, defval: null });
      const r = normalizeSheet(rows);
      expect(r.guide).toBe(guide);
      expect(r.columnsFound).toBe(g.items);
      const x = r.responses[0];
      expect(x.demographics.sexo).toBe("Mujer");
      expect(x.demographics.estudios).toBe("Licenciatura");
      expect(x.demographics.departamento).toBe("Operación");
      expect(x.physical.Ruido).toBe("Bien");
      expect(x.contactName).toBe("Ana");
      expect(x.servesClients).toBe(false);
      expect(evaluateG1(x.g1)).toEqual({ event: true, requiresEvaluation: true });
      // "Casi siempre": directo = 3, inverso = 1; sin reactivos de clientes/jefe
      const masked = maskConditional(guide, x.items, x.servesClients, x.isBoss);
      const skip = new Set([...g.clientItems, ...g.bossItems]);
      let expected = 0;
      for (let n = 1; n <= g.items; n++) if (!skip.has(n)) expected += g.inverse.has(n) ? 1 : 3;
      expect(scoreWorker(guide, masked).final).toBe(expected);
    });
  }
});

import { computeKpis } from "@/lib/nom035/kpis";
describe("KPIs y KRIs", () => {
  const mk = (fill: number, n = 20) => Array.from({ length: n }, (_, i) => ({ d: { departamento: i % 2 ? "A" : "B", jornada: "Fijo Diurno", rotacion: "No", tiempoPuesto: "Entre 1 y 4 años" }, it: Array(72).fill(fill), g1: 0 as const }));
  it("todo en Siempre: reactivos positivos sin riesgo, negativos al máximo", () => {
    const k = computeKpis({ guide: "GUIA_III", records: mk(0), headcount: 20, minGroup: 5 });
    const by = Object.fromEntries(k.map((x) => [x.id, x]));
    expect(by["LR-01"].value).toBe(100); // violencia: 57 positivo (0) + 58–64 negativos (4) = 28 pts ≥ 13
    expect(by["LR-02"].value).toBe(100);
    expect(by["LR-03"].value).toBe(100); // liderazgo todo positivo → 100 favorable
    expect(by["LR-03"].light).toBe("VERDE");
    expect(by["CC-01"].light).toBe("ROJO");
    expect(by["EI-01"].light).toBe("SIN_DATOS");
  });
  it("tendencia, capacitación, quejas y ATS", () => {
    const today = "2026-10-29";
    const k = computeKpis({
      guide: "GUIA_III", records: mk(2), prevRecords: mk(1), headcount: 40, minGroup: 5, today,
      intervention: {
        complaints: [{ receivedAt: "2026-08-01", closedAt: "2026-08-20", category: "VIOLENCIA" }, { receivedAt: "2026-08-01", closedAt: null, category: "OTRO" }],
        trainings: [{ area: "A", attendees: 10, preScore: 60, postScore: 80 }],
        prevActions: [], actions: [{ dueDate: "2026-09-01", doneAt: "2026-08-30" }, { dueDate: "2026-09-01", doneAt: null }],
        ats: [{ status: "ATENDIDO", identifiedAt: "2026-09-01", canalizedAt: "2026-09-05" }, { status: "IDENTIFICADO", identifiedAt: "2026-09-01", canalizedAt: null }],
      },
    });
    const by = Object.fromEntries(k.map((x) => [x.id, x]));
    expect(by["EI-04"].value).toBeCloseTo(0.5, 5); // (80−60)/(100−60)
    expect(by["EI-06"].value).toBe(50);
    expect(by["EI-08"].value).toBe(50);
    expect(by["EI-09"].value).toBe(50);
    expect(by["EI-10"].value).toBe(50);
    expect(by["EI-01"].value).not.toBeNull();
  });
  it("Guía II omite indicadores exclusivos de Guía III", () => {
    const k = computeKpis({ guide: "GUIA_II", records: mk(1).map((r) => ({ ...r, it: r.it.slice(0, 46) })), headcount: 20, minGroup: 5 });
    expect(k.find((x) => x.id === "EO-01")).toBeUndefined();
    expect(k.find((x) => x.id === "LR-05")).toBeUndefined();
    expect(k.length).toBe(23);
  });
});
