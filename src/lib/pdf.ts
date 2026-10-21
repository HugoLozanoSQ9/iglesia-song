"use client";

import { jsPDF } from "jspdf";
import { Cancion, Categoria, Misa } from "@/types/song";
import { getCancion, getCategorias } from "@/lib/storage";

function drawSong(doc: jsPDF, cancion: Cancion, startY: number, pageWidth: number, margin: number): number {
  let y = startY;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 7;
  const chordHeight = 5;

  // Título
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
  doc.setTextColor(15, 23, 42);

  for (const linea of cancion.lineas) {
    if (y > 270) {
      doc.addPage();
      y = margin;
    }

    // Acordes
    let x = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(14, 116, 144); // sky-700

    for (const p of linea.palabras) {
      const chord = p.acorde || "";
      const wordW = Math.max(
        doc.getTextWidth(p.texto || " "),
        doc.getTextWidth(chord || " ")
      );
      if (chord) {
        doc.text(chord, x, y);
      }
      x += wordW + 3;
    }
    y += chordHeight;

    // Letra
    x = margin;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);

    for (const p of linea.palabras) {
      const chord = p.acorde || "";
      const wordW = Math.max(
        doc.getTextWidth(p.texto || " "),
        doc.getTextWidth(chord || " ")
      );
      doc.text(p.texto || "", x, y);
      x += wordW + 3;
    }
    y += lineHeight + 2;
  }

  return y + 6;
}

/** PDF de una sola canción */
export function descargarCancionPDF(cancion: Cancion) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Encabezado
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 0, pageWidth, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Cancionero Parroquial", margin, 8);

  let y = 24;
  y = drawSong(doc, cancion, y, pageWidth, margin);

  // Pie
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

/** PDF del librito de la misa (todas las canciones seleccionadas en orden) */
export function descargarMisaPDF(misa: Misa) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const categorias = getCategorias().sort((a, b) => a.orden - b.orden);

  // Portada
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

  // Índice
  for (const cat of categorias) {
    const cancionId = misa.seleccion[cat.id];
    const cancion = cancionId ? getCancion(cancionId) : null;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const label = `${cat.icono || ""} ${cat.nombre}`;
    const titulo = cancion ? cancion.titulo : "— sin seleccionar —";
    doc.text(label, margin, y);
    doc.text(titulo, margin + 55, y);
    y += 6;
  }

  // Canciones completas
  for (const cat of categorias) {
    const cancionId = misa.seleccion[cat.id];
    if (!cancionId) continue;
    const cancion = getCancion(cancionId);
    if (!cancion) continue;

    doc.addPage();
    y = margin;

    // Badge de categoría
    doc.setFillColor(224, 242, 254);
    doc.roundedRect(margin, y - 4, 80, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(3, 105, 161);
    doc.text(`${cat.icono || ""} ${cat.nombre}`.trim(), margin + 3, y + 1.5);
    y += 12;

    y = drawSong(doc, cancion, y, pageWidth, margin);
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
