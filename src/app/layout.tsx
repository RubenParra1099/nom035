import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOM-035 · Evaluación de factores de riesgo psicosocial",
  description: "Plataforma de captura, calificación e indicadores de la NOM-035-STPS-2018 (Guías I, II y III).",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
