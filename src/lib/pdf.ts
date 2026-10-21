"use client";

import { Cancion, Misa } from "@/types/song";
import { getCancion, getCategorias } from "@/lib/storage";

async function loadJsPDF() {
  try {
    const mod = await import("jspdf");
    return mod.jsPDF;
  } catch {
    alert(
      "Falta instalar jspdf.\n\nEn la carpeta del proyecto ejecuta:\n\nnpm install jspdf\n\nLuego reinicia: npm run dev"
    );
    return null;
  }
}

/**
 * Alinea el acorde sobre la letra indicada por acordeIndex (no siempre al inicio).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawSong(doc: any, cancion: Cancion, startY: number, pageWidth: number, margin: number): number {
  let y = startY;
  const gapWords = 2.2;
  const usableWidth = pageWidth - margin * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(cancion.titulo, margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  if (cancion.tonalidad) {
    doc.text(`Tonalidad: ${cancion.tonalidad}`, margin, y);
    y += 6;
  }
  y += 4;

  for (const linea of cancion.lineas) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    // Ancho de cada palabra (texto completo)
    const wordWidths = linea.palabras.map((p) =>
      Math.max(doc.getTextWidth(p.texto || " "), 3)
    );

    // Partir línea si no cabe
    const rows: number[][] = [[]];
    let rowW = 0;
    linea.palabras.forEach((_, i) => {
      const w = wordWidths[i] + gapWords;
      if (rowW + w > usableWidth && rows[rows.length - 1].length > 0) {
        rows.push([]);
        rowW = 0;
      }
      rows[rows.length - 1].push(i);
      rowW += w;
    });

    for (const indices of rows) {
      if (y > 275) {
        doc.addPage();
        y = margin;
      }

      // Acordes: posición X = inicio de palabra + ancho de las letras previas al índice
      let x = margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(14, 116, 144);

      for (const i of indices) {
        const p = linea.palabras[i];
        if (p.acorde) {
          const texto = p.texto || "";
          const idx = Math.max(0, Math.min(p.acordeIndex ?? 0, Math.max(texto.length - 1, 0)));
          // Ancho aproximado de las letras anteriores al índice
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          const prefix = texto.slice(0, idx);
          const prefixW = prefix ? doc.getTextWidth(prefix) : 0;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text(p.acorde, x + prefixW, y);
        }
        x += wordWidths[i] + gapWords;
      }
      y += 5;

      // Letra
      x = margin;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      for (const i of indices) {
        const p = linea.palabras[i];
        doc.text(p.texto || "", x, y);
        x += wordWidths[i] + gapWords;
      }
      y += 8;
    }

    y += 2;
  }

  return y + 4;
}

export async function descargarCancionPDF(cancion: Cancion) {
  const jsPDF = await loadJsPDF();
  if (!jsPDF) return;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(14, 165, 233);
  doc.rect(0, 0, pageWidth, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Cancionero Parroquial", margin, 8);

  drawSong(doc, cancion, 24, pageWidth, margin);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: "center" });
  }

  const nombre = cancion.titulo.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, "").trim() || "cancion";
  doc.save(`${nombre}.pdf`);
}

export async function descargarMisaPDF(misa: Misa) {
  const jsPDF = await loadJsPDF();
  if (!jsPDF) return;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const categorias = getCategorias().sort((a, b) => a.orden - b.orden);

  doc.setFillColor(14, 165, 233);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(misa.titulo || "Librito de la Misa", pageWidth / 2, 22, { align: "center" });
  if (misa.fecha) {
    doc.setFontSize(12);
    doc.text(misa.fecha, pageWidth / 2, 32, { align: "center" });
  }

  let y = 52;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text("Orden de la misa", margin, y);
  y += 8;

  for (const cat of categorias) {
    const cancionId = misa.seleccion[cat.id];
    const cancion = cancionId ? getCancion(cancionId) : null;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`${cat.icono || ""} ${cat.nombre}`, margin, y);
    doc.text(cancion ? cancion.titulo : "— sin seleccionar —", margin + 55, y);
    y += 6;
  }

  for (const cat of categorias) {
    const cancionId = misa.seleccion[cat.id];
    if (!cancionId) continue;
    const cancion = getCancion(cancionId);
    if (!cancion) continue;

    doc.addPage();
    y = margin;
    doc.setFillColor(224, 242, 254);
    doc.roundedRect(margin, y - 4, 80, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(3, 105, 161);
    doc.text(`${cat.icono || ""} ${cat.nombre}`.trim(), margin + 3, y + 1.5);
    y += 12;
    drawSong(doc, cancion, y, pageWidth, margin);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${misa.titulo} · pág. ${i}/${pageCount}`, pageWidth / 2, 290, { align: "center" });
  }

  const nombre = (misa.titulo || "misa").replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, "").trim();
  doc.save(`${nombre}.pdf`);
}
