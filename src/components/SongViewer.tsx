"use client";

import { Cancion } from "@/types/song";
import { cancionATexto } from "@/lib/storage";
import { descargarCancionPDF } from "@/lib/pdf";

interface SongViewerProps {
  cancion: Cancion;
  showDownload?: boolean;
}

export default function SongViewer({ cancion, showDownload = true }: SongViewerProps) {
  const handleDownloadPDF = () => {
    descargarCancionPDF(cancion);
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
        <div className="space-y-8 font-serif">
          {cancion.lineas.map((linea, idx) => (
            <div key={idx} className="leading-relaxed">
              <div className="flex flex-wrap gap-x-1 mb-0.5">
                {linea.palabras.map((p, pi) => (
                  <span
                    key={pi}
                    className="inline-block text-center min-w-[1.5em] text-sky-700 font-mono font-bold text-sm md:text-base"
                    style={{
                      minWidth: `${Math.max(p.texto.length, (p.acorde || "").length) * 0.6}em`,
                    }}
                  >
                    {p.acorde || "\u00A0"}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-1 text-xl md:text-2xl text-slate-800">
                {linea.palabras.map((p, pi) => (
                  <span
                    key={pi}
                    className="inline-block text-center"
                    style={{
                      minWidth: `${Math.max(p.texto.length, (p.acorde || "").length) * 0.6}em`,
                    }}
                  >
                    {p.texto}
                  </span>
                ))}
              </div>
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
