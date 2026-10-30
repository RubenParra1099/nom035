"use client";
import { useActionState } from "react";
import { createFirstAdmin } from "./actions";

export default function SetupForm({ missingSecret }: { missingSecret: boolean }) {
  const [state, action, pending] = useActionState(createFirstAdmin, null);
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={action} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">Configuración inicial</div>
          <h1 className="text-xl font-semibold">Crear administrador</h1>
          <p className="text-sm text-gray-600">Esta página solo aparece mientras la plataforma no tiene usuarios.</p>
        </div>
        {missingSecret && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Falta la variable <b>AUTH_SECRET</b> en Vercel. Agrégala y vuelve a desplegar para que las sesiones sean seguras.
          </p>
        )}
        <div><label className="label" htmlFor="name">Nombre</label><input className="input" id="name" name="name" required /></div>
        <div><label className="label" htmlFor="email">Correo</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div>
        <div><label className="label" htmlFor="password">Contraseña</label><input className="input" id="password" name="password" type="password" minLength={8} required autoComplete="new-password" /></div>
        <div><label className="label" htmlFor="confirm">Confirmar contraseña</label><input className="input" id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" /></div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? "Creando…" : "Crear administrador y entrar"}</button>
      </form>
    </main>
  );
}
