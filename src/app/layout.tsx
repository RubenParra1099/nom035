import type { Metadata, Viewport } from "next";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOM-035 · Evaluación de factores de riesgo psicosocial",
  description: "Plataforma de captura, calificación e indicadores de la NOM-035-STPS-2018 (Guías I, II y III).",
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f4f6fa" }, { media: "(prefers-color-scheme: dark)", color: "#0b1120" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
