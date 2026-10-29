"use client";

import { useMemo, useState } from "react";
import { Cancion, Palabra, getAcordesDePalabra, limpiarTexto } from "@/types/song";
import { cancionATexto } from "@/lib/storage";
import { descargarCancionPDF } from "@/lib/pdf";
import {
  TONALIDADES,
  notaAIndice,
  indiceANota,
  debeUsarBemoles,
  transponerCancion,
} from "@/lib/transpose";

interface SongViewerProps {
  cancion: Cancion;
  showDownload?: boolean;
}

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

function tonalidadMostrada(base: string | undefined, shift: number): string {
  if (!base) {
    if (!shift) return "—";
    return shift > 0 ? `+${shift} st` : `${shift} st`;
  }
  const idx = notaAIndice(base);
  if (idx === null) return base;
  const flats = debeUsarBemoles(base);
  const t = indiceANota(idx + shift, flats);
  if (!shift) return t;
  return `${t} (${shift > 0 ? "+" : ""}${shift})`;
}

export default function SongViewer({ cancion, showDownload = true }: SongViewerProps) {
  /** Solo en memoria: no se guarda en BD */
  const [shift, setShift] = useState(0);

  const vista = useMemo(
    () =>
      shift === 0
        ? cancion
        : transponerCancion(cancion, shift, {
            actualizarTonalidad: false,
            usarBemoles: debeUsarBemoles(cancion.tonalidad),
          }),
    [cancion, shift]
  );

  const handleDownloadPDF = async (soloLetra = false) => {
    await descargarCancionPDF(vista, { soloLetra });
  };

  const handleCopy = async () => {
    const texto = cancionATexto(vista);
    await navigator.clipboard.writeText(texto);
    alert("¡Copiado al portapapeles!");
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">{cancion.titulo}</h1>
        {cancion.autor && <p className="text-slate-500">Autor: {cancion.autor}</p>}

        {/* Selector de tonalidad / semitonos (temporal) */}
        <div className="mt-4 inline-flex flex-col sm:flex-row items-center gap-3 bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3">
          <div className="text-sm text-sky-900">
            <span className="font-medium">Tonalidad: </span>
            <span className="font-mono font-bold text-lg">
              {tonalidadMostrada(cancion.tonalidad, shift)}
            </span>
            {cancion.tonalidad && (
              <span className="text-xs text-sky-600 ml-2">(base: {cancion.tonalidad})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShift((s) => s - 1)}
              className="w-11 h-11 rounded-xl bg-white border-2 border-sky-300 text-sky-800 text-xl font-bold hover:bg-sky-100 shadow-sm"
              title="Bajar 1 semitono (solo vista)"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setShift(0)}
              className="px-3 py-2 rounded-xl bg-white border border-sky-200 text-sky-700 text-sm font-medium hover:bg-sky-100"
              title="Volver a la tonalidad guardada"
            >
              Original
            </button>
            <button
              type="button"
              onClick={() => setShift((s) => s + 1)}
              className="w-11 h-11 rounded-xl bg-white border-2 border-sky-300 text-sky-800 text-xl font-bold hover:bg-sky-100 shadow-sm"
              title="Subir 1 semitono (solo vista)"
            >
              +
            </button>
          </div>
          {cancion.tonalidad && (
            <select
              className="px-3 py-2 rounded-xl border border-sky-300 bg-white font-mono text-sm"
              value=""
              onChange={(e) => {
                const dest = e.target.value;
                if (!dest || !cancion.tonalidad) return;
                const from = notaAIndice(cancion.tonalidad);
                const to = notaAIndice(dest);
                if (from === null || to === null) return;
                let delta = to - from;
                if (delta > 6) delta -= 12;
                if (delta < -6) delta += 12;
                setShift(delta);
              }}
            >
              <option value="">Ir a tono…</option>
              {TONALIDADES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Los cambios de tono aquí son solo para tocar / imprimir; no modifican la canción guardada.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm overflow-x-auto">
        <div className="space-y-5">
          {vista.lineas.map((linea, idx) => {
            const { chords, lyrics } = buildLine(linea.palabras);
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
                <span className="block text-slate-800">
                  {lyrics.replace(/\s+$/, "") || "\u00A0"}
                </span>
              </pre>
            );
          })}
        </div>
      </div>

      {showDownload && (
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={() => handleDownloadPDF(false)}
            className="px-5 py-3 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 shadow-sm"
          >
            📄 PDF con acordes
          </button>
          <button
            type="button"
            onClick={() => handleDownloadPDF(true)}
            className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 shadow-sm"
          >
            📝 PDF solo letra
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200"
          >
            📋 Copiar texto
          </button>
        </div>
      )}
    </div>
  );
}
