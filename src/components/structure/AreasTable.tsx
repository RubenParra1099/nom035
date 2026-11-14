"use client";
import { useMemo } from "react";

export type AreaRow = { key: number; name: string; count: string };
export const toRows = (areas: { name: string; headcount: number | null }[], start = 0): AreaRow[] =>
  areas.map((a, i) => ({ key: start + i, name: a.name, count: a.headcount == null ? "" : String(a.headcount) }));
export const cleanAreas = (rows: AreaRow[]) => {
  const seen = new Set<string>();
  return rows.filter((r) => r.name.trim()).filter((r) => { const k = r.name.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .map((r) => ({ name: r.name.trim(), headcount: r.count === "" ? null : Math.max(0, parseInt(r.count, 10) || 0) }));
};

/** Plantillas rápidas de áreas por tipo de centro. */
export const AREA_PRESETS: Record<string, string[]> = {
  Manufactura: ["Producción", "Mantenimiento", "Almacén", "Calidad", "Administración", "Recursos Humanos"],
  Oficina: ["Dirección", "Administración", "Finanzas", "Recursos Humanos", "Ventas", "Sistemas"],
  Comercio: ["Piso de venta", "Cajas", "Almacén", "Gerencia", "Administración"],
  Salud: ["Enfermería", "Medicina", "Urgencias", "Administración", "Servicios generales"],
};

/** Tabla editable de áreas con su número de trabajadores y revisión contra el total del centro. */
export default function AreasTable({ rows, setRows, total, onUseSum, compact = false }: {
  rows: AreaRow[]; setRows: (f: (r: AreaRow[]) => AreaRow[]) => void; total: number; onUseSum?: (n: number) => void; compact?: boolean;
}) {
  const named = rows.filter((r) => r.name.trim());
  const sum = named.reduce((a, r) => a + (parseInt(r.count || "0", 10) || 0), 0);
  const withCount = named.filter((r) => r.count !== "").length;
  const dupes = useMemo(() => {
    const seen = new Set<string>(), d = new Set<string>();
    for (const r of named) { const k = r.name.trim().toLowerCase(); if (seen.has(k)) d.add(k); seen.add(k); }
    return d;
  }, [named]);
  const set = (key: number, patch: Partial<AreaRow>) => setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = (names: string[] = [""]) => setRows((cur) => {
    const k = cur.reduce((m, r) => Math.max(m, r.key), 0) + 1;
    const keep = cur.filter((r) => r.name.trim() || r.count);
    const fresh = names.filter((n) => !n || !keep.some((r) => r.name.trim().toLowerCase() === n.toLowerCase()));
    return [...keep, ...fresh.map((name, i) => ({ key: k + i, name, count: "" }))];
  });
  const status = !named.length ? null
    : !total ? { ok: false, text: "Capture el total de trabajadores del centro." }
    : withCount < named.length ? { ok: false, text: `Faltan ${named.length - withCount} áreas sin número de trabajadores.` }
    : sum === total ? { ok: true, text: `Las áreas suman ${sum} de ${total} trabajadores.` }
    : { ok: false, text: sum < total ? `Faltan ${total - sum} trabajadores por asignar a un área.` : `Las áreas suman ${sum - total} trabajadores más que el total.` };
  const grid = "grid grid-cols-[minmax(0,1fr)_5.5rem_2rem] gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_2.25rem]";

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-line">
        <div className={`${grid} bg-surface-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500`}>
          <span>Área o departamento</span><span className="text-right">Trabajadores</span><span />
        </div>
        {rows.map((r) => {
          const dup = r.name.trim() && dupes.has(r.name.trim().toLowerCase());
          return (
            <div key={r.key} className={`${grid} items-center border-t border-line px-3 ${compact ? "py-1.5" : "py-2"}`}>
              <input aria-label="Nombre del área" className={`input ${dup ? "border-red-400" : ""}`} placeholder="Ej. Producción" value={r.name}
                onChange={(e) => set(r.key, { name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
              <input aria-label={`Trabajadores de ${r.name || "el área"}`} type="number" min={0} className="input text-right" placeholder="—" value={r.count}
                onChange={(e) => set(r.key, { count: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
              <button type="button" aria-label={`Quitar ${r.name || "área"}`} className="grid h-9 w-8 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => setRows((cur) => (cur.length > 1 ? cur.filter((x) => x.key !== r.key) : [{ key: r.key, name: "", count: "" }]))}>×</button>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-surface-2/50 px-3 py-2 text-sm">
          <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => add()}>+ Agregar área</button>
          <span className="text-xs text-gray-500">Plantillas rápidas:</span>
          {Object.entries(AREA_PRESETS).map(([k, v]) => (
            <button key={k} type="button" className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 hover:bg-brand-100" onClick={() => add(v)}>+ {k}</button>
          ))}
        </div>
      </div>
      {status && (
        <p className={`text-xs ${status.ok ? "text-green-700" : "text-amber-700"}`}>
          {status.ok ? "✓ " : "⚠ "}{status.text}
          {!status.ok && onUseSum && withCount === named.length && sum > 0 && sum !== total && <> <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => onUseSum(sum)}>Usar {sum} como total</button></>}
        </p>
      )}
      {dupes.size > 0 && <p className="text-xs text-red-600">Hay áreas repetidas; se guardará solo una.</p>}
    </div>
  );
}

/** Convierte texto pegado de Excel (Centro · Área · Trabajadores, o Área · Trabajadores) en filas. */
export function parsePasted(text: string): { centro: string | null; area: string; n: number | null }[] {
  return text.split(/\r?\n/).map((l) => l.split(/\t|;|,/).map((c) => c.trim())).filter((c) => c.some(Boolean))
    .map((c) => {
      const nums = c.map((x) => (/^\d+$/.test(x) ? parseInt(x, 10) : null));
      const ni = nums.findIndex((x) => x !== null);
      const txt = c.filter((_, i) => i !== ni && c[i]);
      if (txt.length >= 2) return { centro: txt[0], area: txt[1], n: ni >= 0 ? nums[ni] : null };
      return { centro: null, area: txt[0] ?? "", n: ni >= 0 ? nums[ni] : null };
    })
    .filter((r) => r.area && !/^(área|area|departamento)$/i.test(r.area) && !/^centro/i.test(r.centro ?? ""));
}
