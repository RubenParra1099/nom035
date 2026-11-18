"use client";
import { useActionState } from "react";
import { acknowledge } from "./actions";

export default function AckForm({ token, areas }: { token: string; areas: string[] }) {
  const [state, action, pending] = useActionState(acknowledge, null);
  if (state?.ok) return (
    <div className="card p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700 dark:bg-green-900/40 dark:text-green-300">✓</div>
      <h2 className="mt-3 text-lg font-semibold text-ink">Confirmación registrada</h2>
      <p className="mt-1 text-sm text-gray-600">Gracias. Ya puede cerrar esta página.</p>
    </div>
  );
  return (
    <form action={action} className="card space-y-4 p-6">
      <input type="hidden" name="token" value={token} />
      <h2 className="text-base font-semibold text-ink">Confirmo de recibido</h2>
      <div><label className="label" htmlFor="name">Nombre o número de empleado</label><input id="name" name="name" className="input" required maxLength={120} autoComplete="name" /></div>
      {areas.length > 0 && <div><label className="label" htmlFor="area">Área</label><select id="area" name="area" className="input" defaultValue=""><option value="">Seleccione…</option>{areas.map((a) => <option key={a}>{a}</option>)}</select></div>}
      <label className="flex items-start gap-2 text-sm text-ink"><input type="checkbox" name="ok" className="mt-1" required />Recibí y leí esta información.</label>
      {state?.error && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Enviando…" : "Confirmar"}</button>
      <p className="text-xs text-gray-500">Su confirmación sirve como evidencia de difusión (numeral 5.7). No se relaciona con sus respuestas a los cuestionarios.</p>
    </form>
  );
}
