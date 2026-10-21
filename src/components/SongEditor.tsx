"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Cancion, ACORDES_COMUNES } from "@/types/song";

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

  const handleTituloChange = (titulo: string) => {
    onChange({ ...cancion, titulo });
  };

  const selectWord = (lineaIdx: number, palabraIdx: number) => {
    setSelectedWord({ lineaIdx, palabraIdx });
    const palabra = cancion.lineas[lineaIdx]?.palabras[palabraIdx];
    setAcordeInput(palabra?.acorde || "");
  };

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

  const applyAcordeInput = () => {
    assignChord(acordeInput.trim());
  };

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

  const addLinea = () => {
    const nuevasLineas = [...cancion.lineas, { palabras: [{ texto: "" }] }];
    onChange({ ...cancion, lineas: nuevasLineas });
  };

  const removeLinea = (idx: number) => {
    if (cancion.lineas.length <= 1) return;
    const nuevas = cancion.lineas.filter((_, i) => i !== idx);
    onChange({ ...cancion, lineas: nuevas });
    setSelectedWord(null);
  };

  const addPalabra = (lineaIdx: number) => {
    const nuevasLineas = cancion.lineas.map((linea, li) => {
      if (li !== lineaIdx) return linea;
      return { palabras: [...linea.palabras, { texto: "" }] };
    });
    onChange({ ...cancion, lineas: nuevasLineas });
  };

  const removePalabra = (lineaIdx: number, palabraIdx: number) => {
    const linea = cancion.lineas[lineaIdx];
    if (!linea || linea.palabras.length <= 1) return;
    const nuevasLineas = cancion.lineas.map((l, li) => {
      if (li !== lineaIdx) return l;
      return { palabras: l.palabras.filter((_, pi) => pi !== palabraIdx) };
    });
    onChange({ ...cancion, lineas: nuevasLineas });
    setSelectedWord(null);
  };

  // Espacio = nueva palabra, Enter = nueva línea, Backspace en vacío = borrar palabra
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    lineaIdx: number,
    palabraIdx: number
  ) => {
    const input = e.currentTarget;
    const value = input.value;

    if (e.key === " " && input.selectionStart === value.length) {
      e.preventDefault();
      updatePalabraTexto(lineaIdx, palabraIdx, value.trimEnd());
      const nuevasLineas = cancion.lineas.map((linea, li) => {
        if (li !== lineaIdx) return linea;
        const nuevasPalabras = [...linea.palabras];
        nuevasPalabras.splice(palabraIdx + 1, 0, { texto: "" });
        return { palabras: nuevasPalabras };
      });
      onChange({ ...cancion, lineas: nuevasLineas });
      setTimeout(() => {
        setSelectedWord({ lineaIdx, palabraIdx: palabraIdx + 1 });
        const nextInput = editorRef.current?.querySelector(
          `input[data-line="${lineaIdx}"][data-word="${palabraIdx + 1}"]`
        ) as HTMLInputElement | null;
        nextInput?.focus();
      }, 10);
    }

    if (e.key === "Backspace" && value === "" && palabraIdx > 0) {
      e.preventDefault();
      removePalabra(lineaIdx, palabraIdx);
      setTimeout(() => {
        const prevInput = editorRef.current?.querySelector(
          `input[data-line="${lineaIdx}"][data-word="${palabraIdx - 1}"]`
        ) as HTMLInputElement | null;
        prevInput?.focus();
        setSelectedWord({ lineaIdx, palabraIdx: palabraIdx - 1 });
      }, 10);
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const nuevasLineas = [...cancion.lineas];
      nuevasLineas.splice(lineaIdx + 1, 0, { palabras: [{ texto: "" }] });
      onChange({ ...cancion, lineas: nuevasLineas });
      setTimeout(() => {
        setSelectedWord({ lineaIdx: lineaIdx + 1, palabraIdx: 0 });
        const nextInput = editorRef.current?.querySelector(
          `input[data-line="${lineaIdx + 1}"][data-word="0"]`
        ) as HTMLInputElement | null;
        nextInput?.focus();
      }, 10);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const texto = e.clipboardData.getData("text");
    if (!texto.includes("\n") && texto.split(/\s+/).length < 3) return;

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
            type="button"
            onClick={() => setShowPalette(!showPalette)}
            className="text-sm text-sky-600 hover:underline"
          >
            {showPalette ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {showPalette && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {ACORDES_COMUNES.slice(0, 48).map((acorde) => (
                <button
                  key={acorde}
                  type="button"
                  onClick={() => assignChord(acorde)}
                  disabled={!selectedWord}
                  className={`px-3 py-2 rounded-lg text-sm font-mono font-semibold transition-all
                    ${
                      selectedWord
                        ? "bg-sky-100 text-sky-800 hover:bg-sky-200 active:scale-95 cursor-pointer"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                >
                  {acorde}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="text"
                value={acordeInput}
                onChange={(e) => setAcordeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyAcordeInput()}
                placeholder="Escribe acorde personalizado..."
                disabled={!selectedWord}
                className="flex-1 min-w-[140px] px-4 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:outline-none font-mono disabled:bg-slate-100"
              />
              <button
                type="button"
                onClick={applyAcordeInput}
                disabled={!selectedWord}
                className="px-5 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aplicar
              </button>
              {selectedWord && (
                <button
                  type="button"
                  onClick={() => assignChord("")}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200"
                >
                  Quitar
                </button>
              )}
            </div>

            {selectedWord ? (
              <p className="mt-2 text-sm text-sky-700">
                Seleccionada:{" "}
                <strong>
                  {cancion.lineas[selectedWord.lineaIdx]?.palabras[selectedWord.palabraIdx]?.texto ||
                    "(vacía)"}
                </strong>
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

      {/* Editor de líneas - inputs editables */}
      <div
        ref={editorRef}
        onPaste={handlePaste}
        className="bg-white rounded-2xl border-2 border-slate-200 p-4 md:p-6 shadow-sm min-h-[300px]"
      >
        <p className="text-sm text-slate-500 mb-4">
          Escribe la letra normalmente. Usa{" "}
          <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">Espacio</kbd> para nueva
          palabra, <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">Enter</kbd> para
          nueva línea. Luego haz clic en una palabra y asígnale un acorde.
        </p>

        <div className="space-y-6">
          {cancion.lineas.map((linea, lineaIdx) => (
            <div key={lineaIdx} className="group relative">
              <div className="flex flex-wrap gap-x-1 gap-y-2 items-end">
                {linea.palabras.map((palabra, palabraIdx) => {
                  const isSelected =
                    selectedWord?.lineaIdx === lineaIdx &&
                    selectedWord?.palabraIdx === palabraIdx;
                  return (
                    <div
                      key={palabraIdx}
                      className="flex flex-col items-center min-w-[2.5rem]"
                    >
                      <span
                        className={`text-sm font-mono font-bold h-6 leading-6 select-none pointer-events-none
                          ${palabra.acorde ? "text-sky-700" : "text-transparent"}
                        `}
                      >
                        {palabra.acorde || "·"}
                      </span>

                      <input
                        type="text"
                        data-line={lineaIdx}
                        data-word={palabraIdx}
                        value={palabra.texto}
                        onChange={(e) =>
                          updatePalabraTexto(lineaIdx, palabraIdx, e.target.value)
                        }
                        onFocus={() => selectWord(lineaIdx, palabraIdx)}
                        onClick={() => selectWord(lineaIdx, palabraIdx)}
                        onKeyDown={(e) => handleKeyDown(e, lineaIdx, palabraIdx)}
                        className={`
                          px-1.5 py-1 rounded text-lg md:text-xl leading-tight text-center
                          border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-sky-400
                          min-w-[2rem] max-w-[14rem]
                          ${
                            isSelected
                              ? "bg-sky-500 text-white ring-2 ring-sky-300"
                              : palabra.acorde
                                ? "bg-sky-50 text-slate-800"
                                : "text-slate-800 hover:bg-slate-100"
                          }
                        `}
                        style={{
                          width: `${Math.max(2.5, (palabra.texto.length || 1) + 1.5)}ch`,
                        }}
                        placeholder="..."
                      />
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => addPalabra(lineaIdx)}
                  className="self-end mb-1 px-2 py-1 text-slate-400 hover:text-sky-600 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Agregar palabra"
                >
                  +
                </button>
              </div>

              <div className="absolute -right-1 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  type="button"
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
          type="button"
          onClick={addLinea}
          className="mt-6 w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-sky-400 hover:text-sky-600 transition-colors font-medium"
        >
          + Agregar línea
        </button>
      </div>

      <div className="flex flex-wrap gap-3 justify-end">
        <button
          type="button"
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
