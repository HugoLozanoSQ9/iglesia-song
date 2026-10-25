"use client";

import { Cancion, Palabra, getAcordesDePalabra, limpiarTexto } from "@/types/song";
import { cancionATexto } from "@/lib/storage";
import { descargarCancionPDF } from "@/lib/pdf";

interface SongViewerProps {
  cancion: Cancion;
  showDownload?: boolean;
}

/**
 * Fila monoespaciada: acordes arriba, letra abajo.
 * Ancho de cada palabra = max(letras, espacio que ocupan los acordes).
 */
function buildLine(palabras: Palabra[]) {
  const chordParts: string[] = [];
  const lyricParts: string[] = [];

  for (const p of palabras) {
    const texto = limpiarTexto(p.texto || "");
    const lista = getAcordesDePalabra(p);

    let width = Math.max(texto.length, 1);
    for (const { acorde, index } of lista) {
      const idx = Math.max(0, Math.min(index, Math.max(texto.length - 1, 0)));
      width = Math.max(width, idx + acorde.length);
    }

    const chars = Array.from(" ".repeat(width));
    for (const { acorde, index } of lista) {
      const idx = Math.max(0, Math.min(index, Math.max(texto.length - 1, 0)));
      for (let k = 0; k < acorde.length; k++) {
        if (idx + k < chars.length) {
          chars[idx + k] = acorde[k];
        }
      }
    }

    chordParts.push(chars.join(""));
    lyricParts.push(texto.padEnd(width));
  }

  return {
    chords: chordParts.join(" "),
    lyrics: lyricParts.join(" "),
  };
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

      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm overflow-x-auto">
        <div className="space-y-5">
          {cancion.lineas.map((linea, idx) => {
            const { chords, lyrics } = buildLine(linea.palabras);
            // Saltar líneas totalmente vacías
            if (!lyrics.trim() && !chords.trim()) return null;
            return (
              <pre
                key={idx}
                className="m-0 font-mono text-[15px] md:text-base leading-snug whitespace-pre"
                style={{
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
              >
                <span className="block text-sky-700 font-bold text-[13px] md:text-sm min-h-[1.15em]">
                  {chords.replace(/\s+$/, "") || "\u00A0"}
                </span>
                <span className="block text-slate-800">{lyrics.replace(/\s+$/, "") || "\u00A0"}</span>
              </pre>
            );
          })}
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
