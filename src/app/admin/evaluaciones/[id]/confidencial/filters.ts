/** Filtros compartidos por Seguimiento confidencial y la impresión masiva de fichas. */
export type SheetFilters = { centro: string; desde: string; hasta: string };

const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function readFilters(sp: { centro?: string; desde?: string; hasta?: string }): SheetFilters {
  return { centro: sp.centro ?? "", desde: isDay(sp.desde) ? sp.desde! : "", hasta: isDay(sp.hasta) ? sp.hasta! : "" };
}

/** Día de respuesta en hora de México (YYYY-MM-DD), para comparar con los campos de fecha. */
const dayOf = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

export function matches(f: SheetFilters, i: { workCenter: string } | null, submittedAt: Date) {
  if (f.centro && i?.workCenter !== f.centro) return false;
  if (!f.desde && !f.hasta) return true;
  const day = dayOf(submittedAt);
  return (!f.desde || day >= f.desde) && (!f.hasta || day <= f.hasta);
}

export function filterQuery(f: SheetFilters) {
  const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  return q ? `?${q}` : "";
}

export function filterLabel(f: SheetFilters) {
  const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const range = f.desde && f.hasta ? `${fmt(f.desde)} – ${fmt(f.hasta)}` : f.desde ? `desde ${fmt(f.desde)}` : f.hasta ? `hasta ${fmt(f.hasta)}` : "";
  return [f.centro, range].filter(Boolean).join(" · ");
}
