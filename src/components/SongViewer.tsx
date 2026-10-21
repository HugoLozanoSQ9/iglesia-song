"use client";

import { Cancion } from "@/types/song";
import { cancionATexto } from "@/lib/storage";
import { descargarCancionPDF } from "@/lib/pdf";

interface SongViewerProps {
  cancion: Cancion;
  showDownload?: boolean;
}

/** Monoespaciado: el acorde cae sobre la letra exacta (acordeIndex). */
function LineaAlineada({
  palabras,
}: {
  palabras: { texto: string; acorde?: string; acordeIndex?: number }[];
}) {
  let chordRow = "";
  let lyricRow = "";

  palabras.forEach((p, wi) => {
    if (wi > 0) {
      chordRow += " ";
      lyricRow += " ";
    }
    const texto = p.texto || "";
    const idx = Math.max(0, Math.min(p.acordeIndex ?? 0, Math.max(texto.length - 1, 0)));
    const ac = p.acorde || "";

    let cStr = " ".repeat(Math.max(texto.length, 1));
    if (ac && texto.length > 0) {
      cStr = " ".repeat(idx) + ac;
      if (cStr.length < texto.length) {
        cStr = cStr.padEnd(texto.length);
      }
    }
    const width = Math.max(cStr.length, texto.length);
    chordRow += cStr.padEnd(width);
    lyricRow += texto.padEnd(width);
  });

  return (
    <div className="font-mono text-base md:text-lg leading-snug whitespace-pre overflow-x-auto">
      <div className="text-sky-700 font-bold text-sm md:text-base min-h-[1.25rem]">
        {chordRow.trimEnd() || "\u00A0"}
      </div>
      <div className="text-slate-800">{lyricRow.trimEnd()}</div>
    </div>
  );
}

export default function SongViewer({ cancion, showDownload = true }: SongViewerProps) {
  const handleDownloadPDF = async () => {
    await descargarCancionPDF(cancion);
  };

  const handleCopy = async () => {
    const texto = cancionATexto(cancion);
    await navigator.clipboard.writeText(texto);
    alert("¡Copiado al portapapeles!");
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">{cancion.titulo}</h1>
        {cancion.tonalidad && (
          <p className="text-slate-500 text-lg">Tonalidad: {cancion.tonalidad}</p>
        )}
        {cancion.autor && <p className="text-slate-500">Autor: {cancion.autor}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="space-y-5">
          {cancion.lineas.map((linea, idx) => (
            <LineaAlineada key={idx} palabras={linea.palabras} />
          ))}
        </div>
      </div>

      {showDownload && (
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="px-6 py-3 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 shadow-sm"
          >
            📄 Descargar PDF
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200"
          >
            📋 Copiar texto
          </button>
        </div>
      )}
    </div>
  );
}
