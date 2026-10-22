"use client";

import { Cancion, Palabra, getAcordesDePalabra } from "@/types/song";
import { cancionATexto } from "@/lib/storage";
import { descargarCancionPDF } from "@/lib/pdf";

interface SongViewerProps {
  cancion: Cancion;
  showDownload?: boolean;
}

/** Construye dos renglones alineados; soporta varios acordes por palabra. */
function buildLine(palabras: Palabra[]) {
  const chordParts: string[] = [];
  const lyricParts: string[] = [];

  for (const p of palabras) {
    const texto = p.texto || "";
    const len = Math.max(texto.length, 1);
    const chars = Array.from(" ".repeat(len));

    const lista = getAcordesDePalabra(p);
    for (const { acorde, index } of lista) {
      const idx = Math.max(0, Math.min(index, Math.max(texto.length - 1, 0)));
      for (let k = 0; k < acorde.length; k++) {
        if (idx + k < chars.length) {
          chars[idx + k] = acorde[k];
        } else {
          chars.push(acorde[k]);
        }
      }
    }

    let chord = chars.join("");
    const width = Math.max(chord.length, texto.length, 1);
    chord = chord.padEnd(width);
    chordParts.push(chord);
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
        <div className="space-y-6">
          {cancion.lineas.map((linea, idx) => {
            const { chords, lyrics } = buildLine(linea.palabras);
            return (
              <pre
                key={idx}
                className="m-0 font-mono text-base md:text-lg leading-snug whitespace-pre"
                style={{
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
              >
                <span className="block text-sky-700 font-bold text-sm md:text-base min-h-[1.25em]">
                  {chords.length ? chords : " "}
                </span>
                <span className="block text-slate-800">{lyrics || " "}</span>
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
