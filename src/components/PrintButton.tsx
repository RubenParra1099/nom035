"use client";
import { useCanDownload } from "./Downloads";

export default function PrintButton() {
  if (!useCanDownload()) return null;
  return <button className="btn-secondary print:hidden" onClick={() => window.print()}>Imprimir / PDF</button>;
}
