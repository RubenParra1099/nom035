"use client";
import { useState } from "react";
import { Drawer, SaveButton } from "@/components/ui/forms";
import { deleteCompany, updateCompany } from "@/app/admin/actions";
import { SECTORS } from "@/lib/sectors";

export type CompanyInfo = { id: string; name: string; rfc: string | null; contact: string | null; sector: string | null; centros: number; evaluaciones: number; respuestas: number | null };

/** Formulario de edición de los datos de la empresa (se usa en el panel lateral y en la pestaña Datos). */
export function CompanyForm({ c }: { c: CompanyInfo }) {
  return (
    <form action={updateCompany} className="space-y-4">
      <input type="hidden" name="id" value={c.id} />
      <div><label className="label">Razón social / nombre</label><input name="name" className="input" defaultValue={c.name} required minLength={2} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">RFC</label><input name="rfc" className="input uppercase" defaultValue={c.rfc ?? ""} /></div>
        <div><label className="label">Giro o sector</label><select name="sector" className="input" defaultValue={c.sector ?? ""}><option value="">Sin especificar</option>{SECTORS.map((x) => <option key={x}>{x}</option>)}</select></div>
      </div>
      <div><label className="label">Contacto</label><input name="contact" className="input" defaultValue={c.contact ?? ""} placeholder="Nombre, correo o teléfono" /></div>
      <p className="text-xs text-gray-500">El giro permite comparar a la empresa contra otras de su sector en el Comparativo.</p>
      <div className="flex justify-end border-t border-line pt-4"><SaveButton done="Empresa actualizada ✓">Guardar cambios</SaveButton></div>
    </form>
  );
}

/** Eliminación con confirmación escribiendo el nombre de la empresa. */
export function DeleteForm({ c }: { c: CompanyInfo }) {
  const [typed, setTyped] = useState("");
  const ok = typed.trim().toLowerCase() === c.name.trim().toLowerCase();
  return (
    <form action={deleteCompany} className="space-y-4">
      <input type="hidden" name="id" value={c.id} />
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
        <b>Esta acción no se puede deshacer.</b> Se eliminarán:
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          <li>{c.centros} {c.centros === 1 ? "centro de trabajo" : "centros de trabajo"} con su estructura de áreas</li>
          <li>{c.evaluaciones} {c.evaluaciones === 1 ? "evaluación" : "evaluaciones"} con {c.respuestas === null ? "todas sus respuestas" : `${c.respuestas.toLocaleString("es-MX")} respuestas`}</li>
          <li>Informes, programas de intervención, casos de Guía I, quejas y capacitaciones</li>
        </ul>
        <p className="mt-2">Los usuarios Cliente de esta empresa quedarán sin empresa asignada.</p>
      </div>
      <div><label className="label" htmlFor={`del-${c.id}`}>Para confirmar, escriba el nombre de la empresa: <b className="text-ink">{c.name}</b></label>
        <input id={`del-${c.id}`} className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" /></div>
      <div className="flex justify-end border-t border-line pt-4">
        <button className="btn-danger disabled:cursor-not-allowed disabled:opacity-50" disabled={!ok}>Eliminar empresa definitivamente</button>
      </div>
    </form>
  );
}

/** Botones Editar y Eliminar de una empresa. `compact` para la tabla de la cartera. */
export default function CompanyActions({ c, canDelete, compact = false }: { c: CompanyInfo; canDelete: boolean; compact?: boolean }) {
  const link = "rounded px-1.5 py-0.5 text-sm font-medium hover:underline";
  return (
    <span className={`inline-flex items-center ${compact ? "gap-1" : "gap-2"}`}>
      <Drawer trigger={compact ? "Editar" : "✎ Editar empresa"} triggerClass={compact ? `${link} text-brand-700` : "btn-secondary"} title="Editar empresa" subtitle={c.name}>
        <CompanyForm c={c} />
      </Drawer>
      {canDelete && (
        <Drawer trigger={compact ? "Eliminar" : "Eliminar"} triggerClass={compact ? `${link} text-red-600` : "btn-secondary text-red-600 hover:border-red-300 hover:bg-red-50"} title="Eliminar empresa" subtitle={c.name}>
          <DeleteForm c={c} />
        </Drawer>
      )}
    </span>
  );
}
