"use client";
import { createContext, useContext, useEffect } from "react";

const Ctx = createContext(true);

/** Si el usuario puede imprimir o descargar (el Cliente de prueba no). Los botones de PDF, Excel, Word, CSV y PNG se ocultan con esto. */
export const useCanDownload = () => useContext(Ctx);

/**
 * Para el Cliente de prueba, además de ocultar los botones, bloquea la impresión del navegador
 * (Ctrl+P o "Imprimir" del menú): la hoja sale con un aviso en lugar del contenido.
 */
export function DownloadsProvider({ allowed, children }: { allowed: boolean; children: React.ReactNode }) {
  useEffect(() => {
    if (allowed) return;
    document.body.classList.add("no-downloads");
    const print = window.print;
    window.print = () => {};
    return () => { document.body.classList.remove("no-downloads"); window.print = print; };
  }, [allowed]);
  return <Ctx.Provider value={allowed}>{children}</Ctx.Provider>;
}
