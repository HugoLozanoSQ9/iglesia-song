"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Cancion, Linea, Palabra, ACORDES_COMUNES } from "@/types/song";

interface SongEditorProps {
  cancion: Cancion;
  onChange: (cancion: Cancion) => void;
  onSave: () => void;
}

export default function SongEditor({ cancion, onChange, onSave }: SongEditorProps) {
  const [selectedWord, setSelectedWord] = useState<{ lineaIdx: number; palabraIdx: number } | null>(null);
  const [acordeInput, setAcordeInput] = useState("");
  const [showPalette, setShowPalette] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  // Actualizar título
  const handleTituloChange = (titulo: string) => {
    onChange({ ...cancion, titulo });
  };

  // Seleccionar palabra
  const selectWord = (lineaIdx: number, palabraIdx: number) => {
    setSelectedWord({ lineaIdx, palabraIdx });
    const palabra = cancion.lineas[lineaIdx]?.palabras[palabraIdx];
    setAcordeInput(palabra?.acorde || "");
  };

  // Asignar acorde a la palabra seleccionada
  const assignChord = useCallback(
    (acorde: string) => {
      if (!selectedWord) return;
      const { lineaIdx, palabraIdx } = selectedWord;
      const nuevasLineas = cancion.lineas.map((linea, li) => {
        if (li !== lineaIdx) return linea;
        return {
          palabras: linea.palabras.map((p, pi) => {
            if (pi !== palabraIdx) return p;
            return { ...p, acorde: acorde || undefined };
          }),
        };
      });
      onChange({ ...cancion, lineas: nuevasLineas });
      setAcordeInput(acorde);
    },
    [selectedWord, cancion, onChange]
  );

  // Aplicar acorde desde input
  const applyAcordeInput = () => {
    assignChord(acordeInput.trim());
  };

  // Agregar nueva línea
  const addLinea = () => {
    const nuevasLineas = [...cancion.lineas, { palabras: [{ texto: "Nueva" }, { texto: "línea" }] }];
    onChange({ ...cancion, lineas: nuevasLineas });
  };

  // Eliminar línea
  const removeLinea = (idx: number) => {
    if (cancion.lineas.length <= 1) return;
    const nuevas = cancion.lineas.filter((_, i) => i !== idx);
    onChange({ ...cancion, lineas: nuevas });
    setSelectedWord(null);
  };

  // Editar texto de una palabra (doble clic o focus)
  const updatePalabraTexto = (lineaIdx: number, palabraIdx: number, texto: string) => {
    const nuevasLineas = cancion.lineas.map((linea, li) => {
      if (li !== lineaIdx) return linea;
      return {
        palabras: linea.palabras.map((p, pi) => {
          if (pi !== palabraIdx) return p;
          return { ...p, texto };
        }),
      };
    });
    onChange({ ...cancion, lineas: nuevasLineas });
  };

  // Dividir palabra o agregar palabra nueva al final de la línea
  const addPalabra = (lineaIdx: number) => {
    const nuevasLineas = cancion.lineas.map((linea, li) => {
      if (li !== lineaIdx) return linea;
      return { palabras: [...linea.palabras, { texto: "nueva" }] };
    });
    onChange({ ...cancion, lineas: nuevasLineas });
  };

  // Eliminar palabra
  const removePalabra = (lineaIdx: number, palabraIdx: number) => {
    const linea = cancion.lineas[lineaIdx];
    if (linea.palabras.length <= 1) return;
    const nuevasLineas = cancion.lineas.map((l, li) => {
      if (li !== lineaIdx) return l;
      return { palabras: l.palabras.filter((_, pi) => pi !== palabraIdx) };
    });
    onChange({ ...cancion, lineas: nuevasLineas });
    setSelectedWord(null);
  };

  // Pegar texto plano (convierte a líneas)
  const handlePaste = (e: React.ClipboardEvent) => {
    const texto = e.clipboardData.getData("text");
    if (!texto.includes("\n") && texto.split(/\s+/).length < 3) return; // texto corto normal

    e.preventDefault();
    const lineasNuevas = texto
      .split("\n")
      .filter((l) => l.trim())
      .map((linea) => ({
        palabras: linea
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((t) => ({ texto: t })),
      }));

    if (lineasNuevas.length > 0) {
      onChange({ ...cancion, lineas: [...cancion.lineas, ...lineasNuevas] });
    }
  };

  // Atajos de teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
      if (e.key === "Escape") {
        setSelectedWord(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {/* Título */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-600">Título de la canción</label>
        <input
          type="text"
          value={cancion.titulo}
          onChange={(e) => handleTituloChange(e.target.value)}
          className="text-2xl md:text-3xl font-bold px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white shadow-sm"
          placeholder="Título..."
        />
      </div>

      {/* Paleta de acordes */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-700 text-lg">Paleta de acordes</h3>
          <button
            onClick={() => setShowPalette(!showPalette)}
            className="text-sm text-sky-600 hover:underline"
          >
            {showPalette ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {showPalette && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {ACORDES_COMUNES.slice(0, 40).map((acorde) => (
                <button
                  key={acorde}
                  onClick={() => assignChord(acorde)}
                  disabled={!selectedWord}
                  className={`px-3 py-2 rounded-lg text-sm font-mono font-semibold transition-all
                    ${selectedWord
                      ? "bg-sky-100 text-sky-800 hover:bg-sky-200 active:scale-95 cursor-pointer"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                >
                  {acorde}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={acordeInput}
                onChange={(e) => setAcordeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyAcordeInput()}
                placeholder="Escribe acorde personalizado..."
                disabled={!selectedWord}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:outline-none font-mono disabled:bg-slate-100"
              />
              <button
                onClick={applyAcordeInput}
                disabled={!selectedWord}
                className="px-5 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aplicar
              </button>
              {selectedWord && (
                <button
                  onClick={() => assignChord("")}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200"
                >
                  Quitar
                </button>
              )}
            </div>

            {selectedWord ? (
              <p className="mt-2 text-sm text-sky-700">
                Seleccionada: <strong>{cancion.lineas[selectedWord.lineaIdx]?.palabras[selectedWord.palabraIdx]?.texto}</strong>
                {" — "}haz clic en un acorde o escribe uno.
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Haz clic en una palabra de la letra para asignarle un acorde.
              </p>
            )}
          </>
        )}
      </div>

      {/* Editor de líneas */}
      <div
        ref={editorRef}
        onPaste={handlePaste}
        className="bg-white rounded-2xl border-2 border-slate-200 p-4 md:p-6 shadow-sm min-h-[300px]"
      >
        <div className="space-y-6">
          {cancion.lineas.map((linea, lineaIdx) => (
            <div key={lineaIdx} className="group relative">
              {/* Fila de acordes + letras */}
              <div className="flex flex-wrap gap-x-1 gap-y-1 items-end">
                {linea.palabras.map((palabra, palabraIdx) => {
                  const isSelected =
                    selectedWord?.lineaIdx === lineaIdx && selectedWord?.palabraIdx === palabraIdx;
                  return (
                    <div
                      key={palabraIdx}
                      className="flex flex-col items-center min-w-[2.5rem]"
                    >
                      {/* Acorde arriba */}
                      <span
                        className={`text-sm font-mono font-bold h-6 leading-6 select-none
                          ${palabra.acorde ? "text-sky-700" : "text-transparent"}
                        `}
                      >
                        {palabra.acorde || "·"}
                      </span>

                      {/* Palabra clickeable */}
                      <button
                        type="button"
                        onClick={() => selectWord(lineaIdx, palabraIdx)}
                        className={`
                          px-1.5 py-1 rounded text-lg md:text-xl leading-tight transition-all
                          ${isSelected
                            ? "bg-sky-500 text-white ring-2 ring-sky-300"
                            : palabra.acorde
                              ? "bg-sky-50 text-slate-800 hover:bg-sky-100"
                              : "text-slate-800 hover:bg-slate-100"
                          }
                        `}
                      >
                        {palabra.texto}
                      </button>
                    </div>
                  );
                })}

                {/* Botón agregar palabra */}
                <button
                  onClick={() => addPalabra(lineaIdx)}
                  className="self-end mb-1 px-2 py-1 text-slate-400 hover:text-sky-600 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Agregar palabra"
                >
                  +
                </button>
              </div>

              {/* Controles de línea */}
              <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={() => removeLinea(lineaIdx)}
                  className="p-1 text-red-400 hover:text-red-600 text-sm"
                  title="Eliminar línea"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addLinea}
          className="mt-6 w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-sky-400 hover:text-sky-600 transition-colors font-medium"
        >
          + Agregar línea
        </button>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-3 justify-end">
        <button
          onClick={onSave}
          className="px-8 py-3 bg-sky-600 text-white rounded-xl font-semibold text-lg hover:bg-sky-700 shadow-md active:scale-[0.98] transition-all"
        >
          💾 Guardar canción
        </button>
      </div>

      <p className="text-center text-sm text-slate-400">
        Tip: Ctrl+S para guardar · Esc para deseleccionar · Puedes pegar texto completo
      </p>
    </div>
  );
}
