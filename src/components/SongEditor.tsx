"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Cancion, Linea, ACORDES_COMUNES } from "@/types/song";

interface SongEditorProps {
  cancion: Cancion;
  onChange: (cancion: Cancion) => void;
  onSave: () => void;
}

interface CoroGuardado {
  id: string;
  nombre: string;
  lineas: Linea[];
}

export default function SongEditor({ cancion, onChange, onSave }: SongEditorProps) {
  const [selectedWord, setSelectedWord] = useState<{ lineaIdx: number; palabraIdx: number } | null>(null);
  const [acordeInput, setAcordeInput] = useState("");
  const [showPalette, setShowPalette] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  // Historial para Ctrl+Z / Ctrl+Y
  const historyRef = useRef<Cancion[]>([]);
  const historyIndexRef = useRef(-1);
  const skipHistoryRef = useRef(false);

  // Selección de líneas para copiar / marcar coro
  const [selStart, setSelStart] = useState<number | null>(null);
  const [selEnd, setSelEnd] = useState<number | null>(null);

  // Coros guardados (en memoria de esta sesión de edición; se pierden al salir si no se insertaron)
  const [coros, setCoros] = useState<CoroGuardado[]>([]);
  const [nombreCoro, setNombreCoro] = useState("Coro");

  // Portapapeles interno de líneas (con acordes)
  const clipboardRef = useRef<Linea[] | null>(null);

  // Inicializar historial
  useEffect(() => {
    if (historyRef.current.length === 0) {
      historyRef.current = [JSON.parse(JSON.stringify(cancion))];
      historyIndexRef.current = 0;
    }
  }, []);

  const pushHistory = useCallback((next: Cancion) => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    const snap = JSON.parse(JSON.stringify(next)) as Cancion;
    // Truncar redo
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snap);
    // Límite 50
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current += 1;
    }
  }, []);

  const applyChange = useCallback(
    (next: Cancion) => {
      pushHistory(next);
      onChange(next);
    },
    [onChange, pushHistory]
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const prev = historyRef.current[historyIndexRef.current];
    skipHistoryRef.current = true;
    onChange(JSON.parse(JSON.stringify(prev)));
  }, [onChange]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const next = historyRef.current[historyIndexRef.current];
    skipHistoryRef.current = true;
    onChange(JSON.parse(JSON.stringify(next)));
  }, [onChange]);

  const handleTituloChange = (titulo: string) => {
    applyChange({ ...cancion, titulo });
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
      applyChange({ ...cancion, lineas: nuevasLineas });
      setAcordeInput(acorde);
    },
    [selectedWord, cancion, applyChange]
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
    applyChange({ ...cancion, lineas: nuevasLineas });
  };

  const addLinea = () => {
    applyChange({
      ...cancion,
      lineas: [...cancion.lineas, { palabras: [{ texto: "" }] }],
    });
  };

  const removeLinea = (idx: number) => {
    if (cancion.lineas.length <= 1) return;
    applyChange({
      ...cancion,
      lineas: cancion.lineas.filter((_, i) => i !== idx),
    });
    setSelectedWord(null);
    setSelStart(null);
    setSelEnd(null);
  };

  const addPalabra = (lineaIdx: number) => {
    const nuevasLineas = cancion.lineas.map((linea, li) => {
      if (li !== lineaIdx) return linea;
      return { palabras: [...linea.palabras, { texto: "" }] };
    });
    applyChange({ ...cancion, lineas: nuevasLineas });
  };

  const removePalabra = (lineaIdx: number, palabraIdx: number) => {
    const linea = cancion.lineas[lineaIdx];
    if (!linea || linea.palabras.length <= 1) return;
    const nuevasLineas = cancion.lineas.map((l, li) => {
      if (li !== lineaIdx) return l;
      return { palabras: l.palabras.filter((_, pi) => pi !== palabraIdx) };
    });
    applyChange({ ...cancion, lineas: nuevasLineas });
    setSelectedWord(null);
  };

  // ---- Selección de líneas ----
  const toggleLineSelection = (idx: number, shiftKey: boolean) => {
    if (selStart === null || !shiftKey) {
      setSelStart(idx);
      setSelEnd(idx);
    } else {
      setSelEnd(idx);
    }
  };

  const getSelectedRange = (): { from: number; to: number } | null => {
    if (selStart === null || selEnd === null) return null;
    return { from: Math.min(selStart, selEnd), to: Math.max(selStart, selEnd) };
  };

  const copySelectedLines = () => {
    const range = getSelectedRange();
    if (!range) {
      alert("Selecciona líneas primero (clic en el número de línea; Shift+clic para rango)");
      return;
    }
    clipboardRef.current = JSON.parse(
      JSON.stringify(cancion.lineas.slice(range.from, range.to + 1))
    );
    alert(`Copiadas ${range.to - range.from + 1} línea(s) con acordes`);
  };

  const pasteLines = () => {
    if (!clipboardRef.current || clipboardRef.current.length === 0) {
      alert("No hay nada copiado. Selecciona líneas y pulsa «Copiar líneas».");
      return;
    }
    const insertAt = selEnd !== null ? selEnd + 1 : cancion.lineas.length;
    const nuevas = [...cancion.lineas];
    const copia = JSON.parse(JSON.stringify(clipboardRef.current)) as Linea[];
    nuevas.splice(insertAt, 0, ...copia);
    applyChange({ ...cancion, lineas: nuevas });
  };

  const guardarCoro = () => {
    const range = getSelectedRange();
    if (!range) {
      alert("Selecciona las líneas del coro (clic en el nº de línea; Shift+clic para varias)");
      return;
    }
    const lineas = JSON.parse(
      JSON.stringify(cancion.lineas.slice(range.from, range.to + 1))
    ) as Linea[];
    const nombre = nombreCoro.trim() || `Coro ${coros.length + 1}`;
    setCoros((prev) => [
      ...prev,
      { id: `${Date.now()}`, nombre, lineas },
    ]);
    alert(`Coro «${nombre}» guardado. Usa «Insertar coro» para repetirlo.`);
  };

  const insertarCoro = (coro: CoroGuardado) => {
    const insertAt = selEnd !== null ? selEnd + 1 : cancion.lineas.length;
    const nuevas = [...cancion.lineas];
    const copia = JSON.parse(JSON.stringify(coro.lineas)) as Linea[];
    nuevas.splice(insertAt, 0, ...copia);
    applyChange({ ...cancion, lineas: nuevas });
  };

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
      applyChange({ ...cancion, lineas: nuevasLineas });
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
      applyChange({ ...cancion, lineas: nuevasLineas });
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
      applyChange({ ...cancion, lineas: [...cancion.lineas, ...lineasNuevas] });
    }
  };

  // Atajos globales: Ctrl+Z, Ctrl+Y, Ctrl+S, Ctrl+C/V de líneas
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if (mod && e.key === "s") {
        e.preventDefault();
        onSave();
      }
      if (e.key === "Escape") {
        setSelectedWord(null);
        setSelStart(null);
        setSelEnd(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, onSave]);

  const range = getSelectedRange();

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {/* Título */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-600">Título de la canción</label>
        <input
          type="text"
          value={cancion.titulo}
          onChange={(e) => handleTituloChange(e.target.value)}
          className="text-2xl md:text-3xl font-bold px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white shadow-sm text-slate-900"
          placeholder="Título..."
        />
      </div>

      {/* Herramientas: undo, coros, copiar */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 space-y-3">
        <h3 className="font-semibold text-slate-700">Herramientas de edición</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={undo}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"
            title="Ctrl+Z"
          >
            ↩ Deshacer
          </button>
          <button
            type="button"
            onClick={redo}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"
            title="Ctrl+Y"
          >
            ↪ Rehacer
          </button>
          <button
            type="button"
            onClick={copySelectedLines}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            📋 Copiar líneas
          </button>
          <button
            type="button"
            onClick={pasteLines}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            📌 Pegar líneas
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            value={nombreCoro}
            onChange={(e) => setNombreCoro(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm w-32"
            placeholder="Nombre coro"
          />
          <button
            type="button"
            onClick={guardarCoro}
            className="px-3 py-2 bg-violet-100 text-violet-800 rounded-lg text-sm font-medium hover:bg-violet-200"
          >
            ⭐ Guardar selección como coro
          </button>
          {coros.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => insertarCoro(c)}
              className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
              title={`${c.lineas.length} línea(s)`}
            >
              + Insertar «{c.nombre}»
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Clic en el <strong>número de línea</strong> para seleccionarla. Shift+clic para seleccionar un rango.
          Luego «Copiar líneas» / «Guardar como coro» e «Insertar coro» para repetir con letra y acordes.
        </p>
        {range && (
          <p className="text-sm text-violet-700 font-medium">
            Seleccionadas: líneas {range.from + 1} – {range.to + 1}
          </p>
        )}
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
                className="flex-1 min-w-[140px] px-4 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:outline-none font-mono disabled:bg-slate-100 text-slate-900"
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
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Haz clic en una palabra para asignarle un acorde.
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
        <p className="text-sm text-slate-500 mb-4">
          Escribe con{" "}
          <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">Espacio</kbd> (nueva palabra) y{" "}
          <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">Enter</kbd> (nueva línea).{" "}
          <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">Ctrl+Z</kbd> deshacer.
        </p>

        <div className="space-y-4">
          {cancion.lineas.map((linea, lineaIdx) => {
            const inRange =
              range !== null && lineaIdx >= range.from && lineaIdx <= range.to;
            return (
              <div
                key={lineaIdx}
                className={`group relative flex gap-2 items-start rounded-lg p-1 ${
                  inRange ? "bg-violet-50 ring-1 ring-violet-300" : ""
                }`}
              >
                {/* Número de línea (selección) */}
                <button
                  type="button"
                  onClick={(e) => toggleLineSelection(lineaIdx, e.shiftKey)}
                  className={`shrink-0 w-8 h-8 mt-5 rounded text-xs font-mono font-bold
                    ${inRange ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  title="Clic = seleccionar · Shift+clic = rango"
                >
                  {lineaIdx + 1}
                </button>

                <div className="flex-1 flex flex-wrap gap-x-1 gap-y-2 items-end">
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
                            min-w-[2rem] max-w-[14rem] text-slate-900
                            ${
                              isSelected
                                ? "bg-sky-100 ring-2 ring-sky-400"
                                : palabra.acorde
                                  ? "bg-sky-50"
                                  : "hover:bg-slate-100"
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

                <button
                  type="button"
                  onClick={() => removeLinea(lineaIdx)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 text-sm mt-5"
                  title="Eliminar línea"
                >
                  ✕
                </button>
              </div>
            );
          })}
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
        Ctrl+Z deshacer · Ctrl+Y rehacer · Ctrl+S guardar · Guardar solo guarda en el repertorio (no descarga PDF)
      </p>
    </div>
  );
}
