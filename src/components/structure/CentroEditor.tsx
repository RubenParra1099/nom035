"use client";
import { useMemo, useState } from "react";
import { Drawer, SaveButton } from "@/components/ui/forms";
import { guideLabel } from "@/lib/nom035/guideLabel";
import AreasTable, { cleanAreas, parsePasted, toRows, type AreaRow } from "./AreasTable";
import { importStructure, saveCentro } from "@/app/admin/estructura-actions";


type C = { id?: string; name: string; address: string | null; headcount: number; areas: { name: string; headcount: number | null }[] };

function CentroForm({ companyId, centro }: { companyId: string; centro?: C }) {
  const [name, setName] = useState(centro?.name ?? "");
  const [address, setAddress] = useState(centro?.address ?? "");
  const [total, setTotal] = useState(centro ? String(centro.headcount) : "");
  const [rows, setRows] = useState<AreaRow[]>(() => (centro?.areas.length ? toRows(centro.areas) : [{ key: 0, name: "", count: "" }]));
  const N = Math.max(0, parseInt(total || "0", 10) || 0);
  const data = useMemo(() => JSON.stringify({ id: centro?.id, name: name.trim(), address: address.trim() || null, headcount: N, areas: cleanAreas(rows) }), [centro?.id, name, address, N, rows]);
  return (
    <form action={saveCentro} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="data" value={data} />
      <div><label className="label">Nombre del centro de trabajo</label><input className="input" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Planta Monterrey, Sucursal Centro" /></div>
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <div><label className="label">Domicilio</label><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div><label className="label">Trabajadores</label><input type="number" min={0} required className="input text-right" value={total} onChange={(e) => setTotal(e.target.value)} /></div>
      </div>
      <p className="text-xs text-gray-500">{N ? <>Con {N} trabajadores: <b className="text-ink">{guideLabel(N)}</b>.</> : "El total define la guía que aplica y la muestra mínima."}</p>
      <div>
        <div className="mb-1.5 text-sm font-semibold text-ink">Áreas del centro</div>
        <AreasTable rows={rows} setRows={setRows} total={N} onUseSum={(n) => setTotal(String(n))} compact />
        <p className="mt-2 text-xs text-gray-500">Las áreas son las opciones de “Departamento / área” del cuestionario y los filtros del tablero. Las evaluaciones abiertas toman los cambios; las cerradas conservan su plantilla.</p>
      </div>
      <div className="flex justify-end border-t border-line pt-4"><SaveButton done={centro ? "Centro actualizado ✓" : "Centro agregado ✓"}>{centro ? "Guardar cambios" : "Agregar centro"}</SaveButton></div>
    </form>
  );
}

/** Botón que abre el panel para agregar o editar un centro con su plantilla por área. */
export function CentroEditor({ companyId, centro, trigger, triggerClass }: { companyId: string; centro?: C; trigger: React.ReactNode; triggerClass?: string }) {
  return (
    <Drawer trigger={trigger} triggerClass={triggerClass} width="max-w-2xl" title={centro ? `Editar ${centro.name}` : "Nuevo centro de trabajo"}
      subtitle="Nombre, domicilio, trabajadores y áreas en un solo lugar.">
      <CentroForm companyId={companyId} centro={centro} />
    </Drawer>
  );
}

/** Carga masiva de la estructura pegando una tabla de Excel. */
export function ImportStructure({ companyId }: { companyId: string }) {
  const [text, setText] = useState("");
  const rows = useMemo(() => parsePasted(text).filter((r) => r.centro), [text]);
  const centros = new Set(rows.map((r) => r.centro!.toLowerCase())).size;
  return (
    <Drawer trigger="⬆ Importar estructura" triggerClass="btn-secondary" width="max-w-2xl" title="Importar estructura desde Excel"
      subtitle="Copie en Excel tres columnas — Centro, Área y Trabajadores — y péguelas aquí.">
      <form action={importStructure} className="space-y-4">
        <input type="hidden" name="companyId" value={companyId} />
        <input type="hidden" name="rows" value={JSON.stringify(rows.map((r) => ({ centro: r.centro, area: r.area, n: r.n })))} />
        <textarea className="input h-48 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)}
          placeholder={"Centro\tÁrea\tTrabajadores\nPlanta Monterrey\tProducción\t120\nPlanta Monterrey\tAlmacén\t35\nOficinas CDMX\tAdministración\t22"} />
        {rows.length > 0 && (
          <div className="max-h-56 overflow-y-auto rounded-xl border border-line">
            <table className="w-full text-sm"><thead className="bg-surface-2"><tr><th className="th">Centro</th><th className="th">Área</th><th className="th text-right">Trabajadores</th></tr></thead>
              <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line"><td className="td">{r.centro}</td><td className="td">{r.area}</td><td className="td text-right tabular-nums">{r.n ?? "—"}</td></tr>)}</tbody></table>
          </div>
        )}
        <p className="text-xs text-gray-500">{rows.length ? `${centros} ${centros === 1 ? "centro" : "centros"} · ${rows.length} áreas. ` : ""}Si un centro ya existe (mismo nombre) se reemplazan sus áreas y su total pasa a ser la suma; si no existe, se crea.</p>
        <div className="flex justify-end border-t border-line pt-4"><SaveButton done="Estructura importada ✓">{rows.length ? `Importar ${rows.length} áreas` : "Importar"}</SaveButton></div>
      </form>
    </Drawer>
  );
}
