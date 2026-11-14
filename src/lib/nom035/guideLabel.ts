import { requiredGuide, sampleSize } from "./score";

/** Guía que aplica a un centro según su número de trabajadores, en texto corto. */
export const guideLabel = (n: number) => {
  const g = requiredGuide(n);
  return !n ? "Sin plantilla" : g === null ? "Solo Guía I" : g === "GUIA_II" ? "Guía II · a todos" : `Guía III · muestra ${sampleSize(n)}`;
};
