"use client";

import { Cancion } from "@/types/song";
import { cancionATexto } from "@/lib/storage";
import { descargarCancionPDF } from "@/lib/pdf";

interface SongViewerProps {
  cancion: Cancion;
  showDownload?: boolean;
}

/** Renderiza una palabra con el acorde encima de la letra indicada por acordeIndex */
function PalabraConAcorde({
  texto,
  acorde,
  acordeIndex = 0,
}: {
  texto: string;
  acorde?: string;
  acordeIndex?: number;
}) {
  const chars = Array.from(texto || " ");
  const idx = Math.max(0, Math.min(acordeIndex, Math.max(chars.length - 1, 0)));

  return (
    <span className="inline-flex flex-col items-stretch mx-0.5">
      {/* Fila de acordes: un slot por letra */}
      <span className="flex font-mono font-bold text-sky-700 text-sm md:text-base leading-none h-5 mb-0.5 select-none">
        {chars.map((_, i) => (
          <span
            key={i}
            className="inline-block text-center"
            style={{ width: "1ch", minWidth: "0.55em" }}
          >
            {acorde && i === idx ? acorde : "\u00A0"}
          </span>
        ))}
        {/* Si el acorde es más ancho que una letra, no comprimir: dejar que sobresalga a la derecha del slot */}
      </span>
      {/* Letra */}
      <span className="text-xl md:text-2xl text-slate-800 leading-tight tracking-normal">
        {chars.map((ch, i) => (
          <span
            key={i}
            className="inline-block text-center"
            style={{ width: "1ch", minWidth: "0.55em" }}
          >
            {ch}
          </span>
        ))}
      </span>
    </span>
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

      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm overflow-x-auto">
        <div className="space-y-6">
          {cancion.lineas.map((linea, idx) => (
            <div key={idx} className="flex flex-wrap items-end gap-x-2 gap-y-1">
              {linea.palabras.map((p, pi) => (
                <PalabraConAcorde
                  key={pi}
                  texto={p.texto}
                  acorde={p.acorde}
                  acordeIndex={p.acordeIndex ?? 0}
                />
              ))}
            </div>
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
