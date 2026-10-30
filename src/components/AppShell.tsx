"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";

type Item = { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean };
const I = {
  building: <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3.5 17V4.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1V17M12.5 8h3a1 1 0 0 1 1 1v8M2 17h16M6.5 6.5h3M6.5 9.5h3M6.5 12.5h3" strokeLinecap="round" /></svg>,
  chart: <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 17h14M5.5 14V9M10 14V4.5M14.5 14V7.5" strokeLinecap="round" /></svg>,
  bell: <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 8a5 5 0 0 1 10 0c0 4 1.5 5.5 1.5 5.5h-13S5 12 5 8ZM8.5 16.5a1.7 1.7 0 0 0 3 0" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  users: <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7.5" cy="7" r="3" /><path d="M2 17c.6-3 2.8-4.5 5.5-4.5S12.4 14 13 17M13 4.2a3 3 0 0 1 0 5.6M15 12.8c1.6.6 2.6 2 3 4.2" strokeLinecap="round" /></svg>,
  menu: <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" /></svg>,
  close: <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" /></svg>,
};

export default function AppShell({ user, role, isAdmin, alerts, logout, children }: {
  user: string; role: string; isAdmin: boolean; alerts: number; logout: () => Promise<void>; children: React.ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const items: Item[] = [
    { href: "/admin", label: "Empresas y evaluaciones", icon: I.building, match: (p) => p === "/admin" || p.startsWith("/admin/empresas") || p.startsWith("/admin/evaluaciones") || p.startsWith("/admin/centros") },
    { href: "/admin/alertas", label: "Alertas", icon: I.bell, match: (p: string) => p.startsWith("/admin/alertas") },
    { href: "/admin/comparativo", label: "Comparativo", icon: I.chart, match: (p: string) => p.startsWith("/admin/comparativo") },
    ...(isAdmin ? [{ href: "/admin/usuarios", label: "Usuarios", icon: I.users, match: (p: string) => p.startsWith("/admin/usuarios") }] : []),
  ];
  const initials = user.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const side = (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/admin" className="flex items-center gap-2.5 px-1">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">035</span>
        <span className="leading-tight"><span className="block text-sm font-semibold text-ink">NOM-035</span><span className="block text-xs text-gray-500">Riesgo psicosocial</span></span>
      </Link>
      <nav className="flex flex-col gap-1" aria-label="Principal">
        {items.map((it) => {
          const on = it.match(path);
          return (
            <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${on ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}>
              {it.icon}<span className="flex-1">{it.label}</span>
              {it.href === "/admin/alertas" && alerts > 0 && <span className="rounded-full px-1.5 py-0.5 text-[11px] font-bold" style={{ background: "var(--lv-muyalto)", color: "var(--lv-muyalto-ink)" }}>{alerts}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3">
        <ThemeToggle />
        <div className="flex items-center gap-3 rounded-lg border border-line p-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">{initials}</span>
          <span className="min-w-0 flex-1 leading-tight"><span className="block truncate text-sm font-medium text-ink">{user}</span><span className="block text-xs text-gray-500">{role}</span></span>
          <form action={logout}><button className="rounded px-1.5 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-900">Salir</button></form>
        </div>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-surface lg:block print:hidden">{side}</aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-2.5 lg:hidden print:hidden">
        <Link href="/admin" className="text-sm font-semibold text-ink">NOM-035</Link>
        {alerts > 0 && <Link href="/admin/alertas" className="ml-auto mr-2 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--lv-muyalto)", color: "var(--lv-muyalto-ink)" }}>{alerts} alertas</Link>}
        <button aria-label="Abrir menú" onClick={() => setOpen(true)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">{I.menu}</button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface shadow-xl">
            <button aria-label="Cerrar menú" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-lg p-2 text-gray-600 hover:bg-gray-100">{I.close}</button>
            {side}
          </div>
        </div>
      )}
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
