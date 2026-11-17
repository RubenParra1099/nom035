import "server-only";
import QRCode from "qrcode";

/** QR del enlace en SVG (para la hoja) y PNG de alta resolución (para la imagen descargable). */
export async function qrImages(url: string) {
  const [qrSvg, qrPng] = await Promise.all([
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#16203A", light: "#FFFFFF" } }),
    QRCode.toDataURL(url, { margin: 1, width: 1200, errorCorrectionLevel: "M", color: { dark: "#16203A", light: "#FFFFFF" } }),
  ]);
  return { qrSvg, qrPng };
}
