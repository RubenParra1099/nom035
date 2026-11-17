"use client";
import { useEffect } from "react";

/** Abre el diálogo de impresión en cuanto carga la página (para "Imprimir todas las fichas"). */
export default function AutoPrint() {
  useEffect(() => {
    // Un momento para que el navegador termine de acomodar las páginas antes de imprimir
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return null;
}
