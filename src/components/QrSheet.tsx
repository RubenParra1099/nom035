"use client";
import { useState } from "react";

/** Datos de la hoja con QR de una evaluación (sin acceso a la base: sirve también para la vista previa). */
export type QrSheetData = {
  company: string;
  /** Centro de trabajo, o "Todos los centros de trabajo" en una evaluación general. */
  workplace: string;
  general: boolean;
  evaluation: string;
  guide: "GUIA_II" | "GUIA_III";
  includeGuideI: boolean;
  url: string;
  /** QR en SVG para la hoja y en PNG (alta resolución) para la imagen descargable. */
  qrSvg: string;
  qrPng: string;
};

// Paleta y tipografía de la hoja impresa
const C = { navy: "#1B2B4B", wine: "#8A2846", ink: "#16203A", muted: "#5B6479", line: "#DCE0E8" };
const FONT = '"Plus Jakarta Sans", system-ui, sans-serif';
/** Escudo NOM-035 de la plataforma (mismo que el ícono del sitio). */
const LOGO_TOP = "/icon.svg";
const NOM = { navy: "#0F2A5F", blue: "#1D4ED8", gray: "#6B7280" };

function texts(d: QrSheetData) {
  const g = d.guide === "GUIA_III" ? { name: "Guía III", n: 72, min: 20 } : { name: "Guía II", n: 46, min: 12 };
  const guias = d.includeGuideI ? `la Guía I y la ${g.name} (${g.n} preguntas)` : `la ${g.name} (${g.n} preguntas)`;
  return {
    eyebrow: "NOM-035-STPS-2018 · Evaluación de riesgo psicosocial",
    title: d.company,
    meta: `${d.evaluation} · ${d.general ? "Todos los centros de trabajo" : d.workplace}`,
    heading: "Escanea con la cámara de tu celular",
    body: `Contestarás ${guias}, unos ${g.min} minutos.${d.general ? " Al iniciar eliges tu centro de trabajo." : ""} Tus respuestas son confidenciales y los resultados se presentan de forma agrupada.`,
    note: `Evaluación de factores de riesgo psicosocial · NOM-035-STPS-2018 · ${d.includeGuideI ? "Guía I + " : ""}${g.name}`,
    foot: "Cuestionarios oficiales de las Guías de referencia de la NOM-035-STPS-2018. Solo el personal responsable de la evaluación puede ver los datos de identificación.",
  };
}

export default function QrSheet({ data }: { data: QrSheetData }) {
  const t = texts(data);
  const [busy, setBusy] = useState(false);
  const file = `QR ${data.company} ${data.evaluation}`.replace(/[\\/:*?"<>|]+/g, " ").trim();

  function printPdf() {
    const before = document.title;
    document.title = file;
    const done = () => { document.title = before; window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
  }

  async function downloadPng() {
    setBusy(true);
    try {
      const url = await renderPng(data);
      const a = document.createElement("a");
      a.href = url; a.download = `${file}.png`; a.click();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" />
      <style>{`
        @media print {
          @page { size: letter; margin: 14mm 13mm 16mm; }
          body * { visibility: hidden !important; }
          #qr-sheet, #qr-sheet * { visibility: visible !important; }
          /* Una sola hoja carta: alto del área imprimible (279 mm − márgenes) para que el pie quede abajo */
          #qr-sheet { position: absolute; inset: 0 auto auto 0; width: 100%; max-width: none !important; min-height: 0 !important; height: 247mm;
            box-shadow: none !important; border: 0 !important; border-radius: 0 !important; padding: 0 !important; break-inside: avoid; overflow: hidden; }
        }`}</style>

      <div className="no-print flex flex-wrap gap-2">
        <button className="btn-primary" onClick={printPdf}>⬇ Descargar PDF</button>
        <button className="btn-secondary" onClick={downloadPng} disabled={busy}>{busy ? "Generando…" : "⬇ Descargar imagen (PNG)"}</button>
      </div>

      <div id="qr-sheet" className="mx-auto flex max-w-[816px] flex-col rounded-xl border border-line bg-white p-12 shadow-sm"
        style={{ fontFamily: FONT, color: C.ink, minHeight: 1000 }}>
        <div className="flex items-center gap-4 pb-3" style={{ borderBottom: `2px solid ${C.wine}` }}>
          <div className="flex shrink-0 items-center gap-2.5 pr-4" style={{ borderRight: `1px solid ${C.line}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_TOP} alt="" style={{ height: 54, width: 54 }} />
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: NOM.navy, letterSpacing: "-.01em" }}>NOM<span style={{ color: NOM.blue }}>-035</span></div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: NOM.gray }}>Riesgo psicosocial</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: C.wine, fontWeight: 700 }}>{t.eyebrow}</div>
            <h1 style={{ fontSize: 24, lineHeight: 1.15, margin: "2px 0", color: C.navy, fontWeight: 800 }}>{t.title}</h1>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{t.meta}</p>
          </div>
        </div>

        <section className="flex-1 text-center" style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18, color: C.wine, fontWeight: 700, paddingBottom: 6, borderBottom: `1px solid ${C.line}` }}>{t.heading}</h2>
          <div style={{ width: 300, margin: "20px auto" }} dangerouslySetInnerHTML={{ __html: data.qrSvg }} />
          <p style={{ fontSize: 14, maxWidth: 560, margin: "12px auto 0", lineHeight: 1.5 }}>{t.body}</p>
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: 10 }}>{t.note}</p>
        </section>

        <div style={{ marginTop: 24, paddingTop: 10, borderTop: `1px solid ${C.line}`, fontSize: 10.5, color: C.muted }}>{t.foot}</div>
      </div>
    </div>
  );
}

/* ---------- Imagen PNG (carta vertical, 150 ppp) dibujada en canvas ---------- */

const load = (src: string) => new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });

function wrap(x: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = []; let line = "";
  for (const w of text.split(" ")) {
    const next = line ? `${line} ${w}` : w;
    if (x.measureText(next).width > maxW && line) { out.push(line); line = w; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

async function renderPng(d: QrSheetData) {
  const t = texts(d);
  const W = 1275, H = 1650, M = 110, S = W / 816; // S: escala respecto a la hoja en pantalla
  await document.fonts.ready;
  const [top, qr] = await Promise.all([load(LOGO_TOP), load(d.qrPng)]);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const x = cv.getContext("2d")!;
  x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
  const font = (w: number, px: number) => `${w} ${px * S}px ${FONT}`;

  // Encabezado
  const lh = 54 * S;
  x.drawImage(top, M, M, lh, lh);
  x.textBaseline = "alphabetic"; x.textAlign = "left";
  const bx = M + lh + 10 * S;
  x.font = font(800, 20); x.fillStyle = NOM.navy; x.fillText("NOM", bx, M + 27 * S);
  const wNom = x.measureText("NOM").width; x.fillStyle = NOM.blue; x.fillText("-035", bx + wNom, M + 27 * S);
  const wBrand = wNom + x.measureText("-035").width;
  x.font = font(600, 10); x.fillStyle = NOM.gray; x.letterSpacing = `${0.8 * S}px`;
  x.fillText("RIESGO PSICOSOCIAL", bx, M + 42 * S); const wSub = x.measureText("RIESGO PSICOSOCIAL").width; x.letterSpacing = "0px";
  const sepX = bx + Math.max(wBrand, wSub) + 16 * S;
  x.fillStyle = C.line; x.fillRect(sepX, M, 1 * S, lh);
  const tx = sepX + 16 * S;
  x.fillStyle = C.wine; x.font = font(700, 11);
  x.letterSpacing = `${1.5 * S}px`; x.fillText(t.eyebrow.toUpperCase(), tx, M + 14 * S); x.letterSpacing = "0px";
  x.fillStyle = C.navy; x.font = font(800, 24);
  const titleLines = wrap(x, t.title, W - M - tx);
  titleLines.forEach((l, i) => x.fillText(l, tx, M + 40 * S + i * 28 * S));
  x.fillStyle = C.muted; x.font = font(400, 12);
  const metaY = M + 40 * S + (titleLines.length - 1) * 28 * S + 20 * S;
  x.fillText(t.meta, tx, metaY);
  let y = Math.max(M + lh, metaY) + 12 * S;
  x.fillStyle = C.wine; x.fillRect(M, y, W - 2 * M, 2 * S);

  // Cuerpo centrado
  y += 52 * S; x.textAlign = "center";
  x.fillStyle = C.wine; x.font = font(700, 18); x.fillText(t.heading, W / 2, y);
  y += 12 * S; x.fillStyle = C.line; x.fillRect(M, y, W - 2 * M, 1 * S);
  y += 24 * S; const q = 300 * S;
  x.imageSmoothingEnabled = false; x.drawImage(qr, (W - q) / 2, y, q, q); x.imageSmoothingEnabled = true;
  y += q + 44 * S;
  x.fillStyle = C.ink; x.font = font(400, 14);
  for (const l of wrap(x, t.body, 560 * S)) { x.fillText(l, W / 2, y); y += 21 * S; }
  y += 8 * S; x.fillStyle = C.muted; x.font = font(400, 11.5); x.fillText(t.note, W / 2, y);

  // Pie
  x.textAlign = "left"; x.fillStyle = C.muted; x.font = font(400, 10.5);
  const footLines = wrap(x, t.foot, W - 2 * M), fy = H - M - footLines.length * 15 * S;
  x.fillStyle = C.line; x.fillRect(M, fy - 10 * S, W - 2 * M, 1 * S);
  x.fillStyle = C.muted;
  footLines.forEach((l, i) => x.fillText(l, M, fy + 12 * S + i * 15 * S));
  return cv.toDataURL("image/png");
}
