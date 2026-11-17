import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

/** Vista previa local del modo demo (no existe en producción): ?on=1 lo muestra encendido. */
export default async function DemoPreviewPage({ searchParams }: { searchParams: Promise<{ on?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const on = (await searchParams).on === "1";
  async function noop() { "use server"; }
  const rows = on
    ? [["Manufacturas del Bajío SA de CV", "Manufactura", 3, 412], ["Yura Corporation Mexico", "Automotriz", 2, 268]]
    : [["Secretaría del Ayuntamiento", "Gobierno municipal", 14, 187]];
  return (
    <AppShell user="Rubén Parra" role="Administrador" isAdmin alerts={on ? 2 : 1} logout={noop} demo={{ on, toggle: noop }}>
      <p className="mb-3 text-xs text-gray-500">Vista previa con datos de ejemplo · <Link className="underline" href={on ? "/dev/demo" : "/dev/demo?on=1"}>ver con el modo demo {on ? "apagado" : "encendido"}</Link></p>
      <h1 className="mb-4 text-2xl font-semibold text-ink">Empresas</h1>
      <div className="card divide-y divide-line">
        {rows.map(([name, sector, centros, resp]) => (
          <div key={name} className="flex items-center justify-between gap-3 p-4">
            <div>
              <div className="flex items-center gap-2 font-semibold text-ink">{name}{on && <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-white">DEMO</span>}</div>
              <div className="text-xs text-gray-500">{sector} · {centros} centros · {resp} respuestas</div>
            </div>
            <span className="text-sm text-brand-700">Abrir →</span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
