/** Guía de Referencia I — Cuestionario para identificar a los trabajadores que fueron sujetos a acontecimientos traumáticos severos. */
export const G1_SECTIONS = [
  {
    key: "I",
    title: "Acontecimiento traumático severo",
    prompt: "¿Ha presenciado o sufrido alguna vez, durante o con motivo del trabajo, un acontecimiento como los siguientes?",
    items: [
      "¿Accidente que tenga como consecuencia la muerte, la pérdida de un miembro o una lesión grave?",
      "¿Asaltos?",
      "¿Actos violentos que derivaron en lesiones graves?",
      "¿Secuestro?",
      "¿Amenazas?",
      "¿Cualquier otro que ponga en riesgo su vida o salud, y/o la de otras personas?",
    ],
  },
  {
    key: "II",
    title: "Recuerdos persistentes sobre el acontecimiento (durante el último mes)",
    prompt: "",
    items: [
      "¿Ha tenido recuerdos recurrentes sobre el acontecimiento que le provocan malestares?",
      "¿Ha tenido sueños de carácter recurrente sobre el acontecimiento, que le producen malestar?",
    ],
  },
  {
    key: "III",
    title: "Esfuerzo por evitar circunstancias parecidas o asociadas al acontecimiento (durante el último mes)",
    prompt: "",
    items: [
      "¿Se ha esforzado por evitar todo tipo de sentimientos, conversaciones o situaciones que le puedan recordar el acontecimiento?",
      "¿Se ha esforzado por evitar todo tipo de actividades, lugares o personas que motivan recuerdos del acontecimiento?",
      "¿Ha tenido dificultad para recordar alguna parte importante del evento?",
      "¿Ha disminuido su interés en sus actividades cotidianas?",
      "¿Se ha sentido usted alejado o distante de los demás?",
      "¿Ha notado que tiene dificultad para expresar sus sentimientos?",
      "¿Ha tenido la impresión de que su vida se va a acortar, que va a morir antes que otras personas o que tiene un futuro limitado?",
    ],
  },
  {
    key: "IV",
    title: "Afectación (durante el último mes)",
    prompt: "",
    items: [
      "¿Ha tenido usted dificultades para dormir?",
      "¿Ha estado particularmente irritable o le han dado arranques de coraje?",
      "¿Ha tenido dificultad para concentrarse?",
      "¿Ha estado nervioso o constantemente en alerta?",
      "¿Se ha sobresaltado fácilmente por cualquier cosa?",
    ],
  },
] as const;

/** 20 respuestas booleanas en orden (6 + 2 + 7 + 5). */
export type G1Answers = (boolean | null)[];

export function evaluateG1(a: G1Answers) {
  const at = (i: number) => a[i] === true;
  const I = [0, 1, 2, 3, 4, 5].some(at);
  if (!I) return { event: false, requiresEvaluation: false };
  const II = [6, 7].some(at);
  const III = [8, 9, 10, 11, 12, 13, 14].filter(at).length;
  const IV = [15, 16, 17, 18, 19].filter(at).length;
  return { event: true, requiresEvaluation: II || III >= 3 || IV >= 2 };
}

export function parseYesNo(v: unknown): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  const t = String(v).trim().toLowerCase();
  if (["si", "sí", "yes", "true", "1"].includes(t)) return true;
  if (["no", "false", "0"].includes(t)) return false;
  return null;
}
