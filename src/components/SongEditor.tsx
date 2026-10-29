"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Cancion,
  Linea,
  ACORDES_COMUNES,
  AcordePos,
  getAcordesDePalabra, limpiarTexto } from "@/types/song";
import { TONALIDADES, transponerCancion, debeUsarBemoles } from "@/lib/transpose";

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

/** Rejilla 1 columna por letra; varios acordes anclados a distintas letras. */
function PalabraGrid({
  texto,
  acordes,
  selected,
  onSelect,
  onChangeTexto,
}: {
  texto: string;
  acordes: AcordePos[];
  selected: boolean;
  onSelect: () => void;
  onChangeTexto: (t: string) => void;
}) {
  const letters = Array.from(limpiarTexto(texto || "") || " ");
  const byIndex = new Map<number, string>();
  for (const a of acordes) {
    const idx = Math.max(0, Math.min(a.index, Math.max(letters.length - 1, 0)));
    byIndex.set(idx, a.acorde);
  }

  return (
    <div
      className={`inline-block font-mono mx-0.5 rounded ${
        selected ? "ring-2 ring-sky-400 bg-sky-50" : acordes.length ? "bg-sky-50/50" : ""
      }`}
      onClick={onSelect}
    >
      <div className="flex flex-row">
        {letters.map((ch, i) => (
          <div
            key={i}
            className="flex flex-col items-center"
            style={{ width: "1ch", minWidth: "1ch" }}
          >
            <span className="relative h-4 w-full block">
              {byIndex.has(i) && (
                <span className="absolute left-0 top-0 text-sky-700 font-bold text-[11px] leading-none whitespace-nowrap z-10">
                  {byIndex.get(i)}
                </span>
              )}
            </span>
            <span className="text-lg leading-tight text-slate-900 select-none">
              {ch === " " ? "\u00A0" : ch}
            </span>
          </div>
        ))}
      </div>
      {selected && (
        <input
          type="text"
          value={texto}
          onChange={(e) => onChangeTexto(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 w-full text-xs px-1 py-0.5 border border-sky-300 rounded font-mono text-slate-800"
          placeholder="Editar palabra..."
        />
      )}
    </div>
  );
}

export default function SongEditor({ cancion, onChange, onSave }: SongEditorProps) {
  const [selectedWord, setSelectedWord] = useState<{
    lineaIdx: number;
    palabraIdx: number;
  } | null>(null);
  /** Letra activa dentro de la palabra (dónde se aplicará el siguiente acorde) */
  const [selectedLetter, setSelectedLetter] = useState(0);
  const [acordeInput, setAcordeInput] = useState("");
  const [showQuickChords, setShowQuickChords] = useState(false);

  const historyRef = useRef<Cancion[]>([]);
  const historyIndexRef = useRef(-1);
  const skipHistoryRef = useRef(false);

  const [selStart, setSelStart] = useState<number | null>(null);
  const [selEnd, setSelEnd] = useState<number | null>(null);

  const [coros, setCoros] = useState<CoroGuardado[]>([]);
  const [nombreCoro, setNombreCoro] = useState("Coro");
  const clipboardRef = useRef<Linea[] | null>(null);
  const [clipboardStatus, setClipboardStatus] = useState<string>("");
  const [coroStatus, setCoroStatus] = useState<string>("");

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
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snap);
    if (historyRef.current.length > 50) historyRef.current.shift();
    else historyIndexRef.current += 1;
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
    skipHistoryRef.current = true;
    onChange(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
  }, [onChange]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    skipHistoryRef.current = true;
    onChange(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
  }, [onChange]);

  const selectWord = (lineaIdx: number, palabraIdx: number) => {
    setSelectedWord({ lineaIdx, palabraIdx });
    setSelectedLetter(0);
    const p = cancion.lineas[lineaIdx]?.palabras[palabraIdx];
    const lista = p ? getAcordesDePalabra(p) : [];
    setAcordeInput(lista[0]?.acorde || "");
  };

  /** Pone o reemplaza un acorde en la letra `index` sin borrar los demás. */
  const setChordAtLetter = useCallback(
    (acorde: string, index: number) => {
      if (!selectedWord) return;
      const { lineaIdx, palabraIdx } = selectedWord;
      const nuevasLineas = cancion.lineas.map((linea, li) => {
        if (li !== lineaIdx) return linea;
        return {
          palabras: linea.palabras.map((p, pi) => {
            if (pi !== palabraIdx) return p;
            const maxIdx = Math.max(0, (p.texto || "").length - 1);
            const idx = Math.max(0, Math.min(index, maxIdx));
            let lista = getAcordesDePalabra(p).filter((a) => a.index !== idx);
            if (acorde && acorde.trim()) {
              lista = [...lista, { acorde: acorde.trim(), index: idx }].sort(
                (a, b) => a.index - b.index
              );
            }
            // Guardar solo en formato nuevo; limpiar legacy
            const { acorde: _a, acordeIndex: _i, ...rest } = p;
            return { ...rest, texto: p.texto, acordes: lista.length ? lista : undefined };
          }),
        };
      });
      applyChange({ ...cancion, lineas: nuevasLineas });
      setAcordeInput(acorde.trim());
      setSelectedLetter(index);
    },
    [selectedWord, cancion, applyChange]
  );

  const applyAcordeInput = () => {
    if (!selectedWord) return;
    setChordAtLetter(acordeInput.trim(), selectedLetter);
  };

  const quitarAcordeEnLetra = () => {
    setChordAtLetter("", selectedLetter);
  };

  const quitarTodosAcordes = () => {
    if (!selectedWord) return;
    const { lineaIdx, palabraIdx } = selectedWord;
    applyChange({
      ...cancion,
      lineas: cancion.lineas.map((linea, li) => {
        if (li !== lineaIdx) return linea;
        return {
          palabras: linea.palabras.map((p, pi) => {
            if (pi !== palabraIdx) return p;
            const { acorde: _a, acordeIndex: _i, acordes: _c, ...rest } = p;
            return { ...rest, texto: p.texto };
          }),
        };
      }),
    });
    setAcordeInput("");
  };

  const updatePalabraTexto = (lineaIdx: number, palabraIdx: number, textoRaw: string) => {
    const texto = limpiarTexto(textoRaw);
    applyChange({
      ...cancion,
      lineas: cancion.lineas.map((linea, li) => {
        if (li !== lineaIdx) return linea;
        return {
          palabras: linea.palabras.map((p, pi) => {
            if (pi !== palabraIdx) return p;
            const maxIdx = Math.max(0, texto.length - 1);
            const lista = getAcordesDePalabra(p)
              .map((a) => ({ ...a, index: Math.min(a.index, maxIdx) }))
              .filter((a, i, arr) => arr.findIndex((x) => x.index === a.index) === i);
            const { acorde: _a, acordeIndex: _i, ...rest } = p;
            return {
              ...rest,
              texto,
              acordes: lista.length ? lista : undefined,
            };
          }),
        };
      }),
    });
  };

  const addLinea = () => {
    applyChange({
      ...cancion,
      lineas: [...cancion.lineas, { palabras: [{ texto: "" }] }],
    });
  };

  const removeLinea = (idx: number) => {
    if (cancion.lineas.length <= 1) return;
    applyChange({ ...cancion, lineas: cancion.lineas.filter((_, i) => i !== idx) });
    setSelectedWord(null);
    setSelStart(null);
    setSelEnd(null);
  };

  const addPalabra = (lineaIdx: number) => {
    applyChange({
      ...cancion,
      lineas: cancion.lineas.map((linea, li) =>
        li !== lineaIdx ? linea : { palabras: [...linea.palabras, { texto: "" }] }
      ),
    });
  };

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

  const copySelectedLines = useCallback(() => {
    const range = getSelectedRange();
    if (!range) return false;
    const lines = JSON.parse(
      JSON.stringify(cancion.lineas.slice(range.from, range.to + 1))
    ) as Linea[];
    clipboardRef.current = lines;
    setClipboardStatus(`📋 ${lines.length} línea(s) copiada(s) (listas para Pegar)`);
    setCoroStatus("");
    return true;
  }, [cancion.lineas, selStart, selEnd]);

  const pasteLines = useCallback(() => {
    if (!clipboardRef.current?.length) {
      setClipboardStatus("No hay líneas copiadas. Selecciona nº de línea y pulsa Copiar.");
      return false;
    }
    const insertAt = selEnd !== null ? selEnd + 1 : cancion.lineas.length;
    const nuevas = [...cancion.lineas];
    const copia = JSON.parse(JSON.stringify(clipboardRef.current)) as Linea[];
    nuevas.splice(insertAt, 0, ...copia);
    applyChange({ ...cancion, lineas: nuevas });
    setClipboardStatus(`📌 Pegadas ${copia.length} línea(s)`);
    return true;
  }, [cancion, selEnd, applyChange]);

  const guardarCoro = () => {
    const range = getSelectedRange();
    if (!range) {
      alert("Selecciona líneas (clic en el nº; Shift+clic para rango)");
      return;
    }
    const lineas = JSON.parse(
      JSON.stringify(cancion.lineas.slice(range.from, range.to + 1))
    ) as Linea[];
    const nombre = nombreCoro.trim() || `Coro ${coros.length + 1}`;
    // Solo guarda en la lista de coros. NO toca el portapapeles de líneas.
    setCoros((prev) => [...prev, { id: `${Date.now()}`, nombre, lineas }]);
    setCoroStatus(`⭐ Coro "${nombre}" guardado. Usa el botón + ${nombre} para insertarlo.`);
    setClipboardStatus("");
  };

  const insertarCoro = (coro: CoroGuardado) => {
    const insertAt = selEnd !== null ? selEnd + 1 : cancion.lineas.length;
    const nuevas = [...cancion.lineas];
    const lineas = JSON.parse(JSON.stringify(coro.lineas)) as Linea[];
    nuevas.splice(insertAt, 0, ...lineas);
    applyChange({ ...cancion, lineas: nuevas });
    setCoroStatus(`➕ Insertado coro "${coro.nombre}" (${lineas.length} líneas)`);
  };

  const handlePasteText = (e: React.ClipboardEvent) => {
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
    if (lineasNuevas.length) {
      applyChange({ ...cancion, lineas: [...cancion.lineas, ...lineasNuevas] });
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key === "s") {
        e.preventDefault();
        onSave();
        return;
      }
      if (mod && e.key === "c" && selStart !== null) {
        if (copySelectedLines()) e.preventDefault();
        return;
      }
      if (mod && e.key === "v" && clipboardRef.current?.length) {
        const tag = (e.target as HTMLElement)?.tagName;
        const inField = tag === "INPUT" || tag === "TEXTAREA";
        // No interceptar si está escribiendo en un campo de texto
        if (!inField) {
          if (pasteLines()) e.preventDefault();
        }
        return;
      }
      if (e.key === "Escape") {
        setSelectedWord(null);
        setSelStart(null);
        setSelEnd(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, onSave, selStart, copySelectedLines, pasteLines]);

  const range = getSelectedRange();
  const selectedPalabra = selectedWord
    ? cancion.lineas[selectedWord.lineaIdx]?.palabras[selectedWord.palabraIdx]
    : null;
  const acordesSeleccionados = selectedPalabra
    ? getAcordesDePalabra(selectedPalabra)
    : [];
  const acordeEnLetraActiva = acordesSeleccionados.find((a) => a.index === selectedLetter);

  return (
    <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto pb-40">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-600">Título de la canción</label>
        <input
          type="text"
          value={cancion.titulo}
          onChange={(e) => applyChange({ ...cancion, titulo: e.target.value })}
          className="text-2xl md:text-3xl font-bold px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white shadow-sm text-slate-900"
          placeholder="Título..."
        />
      </div>

      {/* Tonalidad por defecto (se guarda en BD) */}
      <div className="flex flex-wrap items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
        <label className="text-sm font-medium text-violet-800">Tonalidad base</label>
        <select
          value={cancion.tonalidad || ""}
          onChange={(e) =>
            applyChange({ ...cancion, tonalidad: e.target.value || undefined })
          }
          className="px-3 py-2 rounded-lg border border-violet-300 bg-white text-slate-800 font-mono font-semibold"
        >
          <option value="">Sin definir</option>
          {TONALIDADES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="text-xs text-violet-600 hidden sm:inline">
          Transponer toda la canción (cambia acordes y tonalidad base):
        </span>
        <button
          type="button"
          onClick={() => {
            const next = transponerCancion(cancion, -1, {
              actualizarTonalidad: true,
              usarBemoles: debeUsarBemoles(cancion.tonalidad),
            });
            applyChange(next);
          }}
          className="px-3 py-2 rounded-lg bg-white border border-violet-300 text-violet-800 font-bold hover:bg-violet-100"
          title="Bajar 1 semitono (guarda al guardar la canción)"
        >
          −1
        </button>
        <button
          type="button"
          onClick={() => {
            const next = transponerCancion(cancion, 1, {
              actualizarTonalidad: true,
              usarBemoles: debeUsarBemoles(cancion.tonalidad),
            });
            applyChange(next);
          }}
          className="px-3 py-2 rounded-lg bg-white border border-violet-300 text-violet-800 font-bold hover:bg-violet-100"
          title="Subir 1 semitono (guarda al guardar la canción)"
        >
          +1
        </button>
      </div>

      <div
        onPaste={handlePasteText}
        className="bg-white rounded-2xl border-2 border-slate-200 p-4 md:p-6 shadow-sm min-h-[300px]"
      >
        <p className="text-sm text-slate-500 mb-4">
          Clic en una <strong>palabra</strong> → elige la <strong>letra</strong> → escribe el acorde.
          Puedes poner <strong>varios acordes</strong> en la misma palabra (un cambio por letra).
        </p>

        <div className="space-y-5">
          {cancion.lineas.map((linea, lineaIdx) => {
            const inRange = range !== null && lineaIdx >= range.from && lineaIdx <= range.to;
            return (
              <div
                key={lineaIdx}
                className={`flex gap-2 items-start rounded-lg p-1 ${
                  inRange ? "bg-violet-50 ring-1 ring-violet-300" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => toggleLineSelection(lineaIdx, e.shiftKey)}
                  className={`shrink-0 w-8 h-8 mt-3 rounded text-xs font-mono font-bold
                    ${inRange ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                >
                  {lineaIdx + 1}
                </button>

                <div className="flex-1 flex flex-wrap gap-x-1 gap-y-3 items-start">
                  {linea.palabras.map((palabra, palabraIdx) => (
                    <PalabraGrid
                      key={palabraIdx}
                      texto={palabra.texto}
                      acordes={getAcordesDePalabra(palabra)}
                      selected={
                        selectedWord?.lineaIdx === lineaIdx &&
                        selectedWord?.palabraIdx === palabraIdx
                      }
                      onSelect={() => selectWord(lineaIdx, palabraIdx)}
                      onChangeTexto={(val) => updatePalabraTexto(lineaIdx, palabraIdx, limpiarTexto(val))}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => addPalabra(lineaIdx)}
                    className="mt-4 px-2 py-1 text-slate-400 hover:text-sky-600 text-sm"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeLinea(lineaIdx)}
                  className="mt-3 p-1 text-red-400 hover:text-red-600 text-sm"
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
          className="mt-6 w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-sky-400 hover:text-sky-600 font-medium"
        >
          + Agregar línea
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          className="px-8 py-3 bg-sky-600 text-white rounded-xl font-semibold text-lg hover:bg-sky-700 shadow-md"
        >
          💾 Guardar canción
        </button>
      </div>

      {/* Sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto px-3 py-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={undo} className="px-2.5 py-1.5 bg-slate-100 rounded-lg text-sm hover:bg-slate-200" title="Ctrl+Z">
              ↩
            </button>
            <button type="button" onClick={redo} className="px-2.5 py-1.5 bg-slate-100 rounded-lg text-sm hover:bg-slate-200" title="Ctrl+Y">
              ↪
            </button>
            <button
              type="button"
              onClick={() => {
                if (!copySelectedLines()) alert("Selecciona líneas (nº)");
              }}
              className="px-2.5 py-1.5 bg-slate-100 rounded-lg text-sm hover:bg-slate-200"
            >
              📋 Copiar
            </button>
            <button
              type="button"
              onClick={() => {
                if (!pasteLines()) alert("No hay líneas copiadas");
              }}
              className="px-2.5 py-1.5 bg-slate-100 rounded-lg text-sm hover:bg-slate-200"
            >
              📌 Pegar
            </button>
            <input
              type="text"
              value={nombreCoro}
              onChange={(e) => setNombreCoro(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-slate-300 text-sm w-24"
              placeholder="Coro"
            />
            <button
              type="button"
              onClick={guardarCoro}
              className="px-2.5 py-1.5 bg-violet-100 text-violet-800 rounded-lg text-sm font-medium hover:bg-violet-200"
            >
              ⭐ Guardar coro
            </button>
            {coros.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => insertarCoro(c)}
                className="px-2.5 py-1.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
              >
                + {c.nombre}
              </button>
            ))}
            {range && (
              <span className="text-xs text-violet-700 font-medium">
                Líneas {range.from + 1}–{range.to + 1}
              </span>
            )}
            <button
              type="button"
              onClick={onSave}
              className="ml-auto px-4 py-1.5 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700 shadow-sm"
            >
              💾 Guardar
            </button>
          </div>
          {(clipboardStatus || coroStatus) && (
            <div className="text-xs text-slate-600 flex flex-wrap gap-3">
              {clipboardStatus && <span>{clipboardStatus}</span>}
              {coroStatus && <span className="text-violet-700">{coroStatus}</span>}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {selectedPalabra ? (
              <>
                <span className="text-sm text-slate-600 shrink-0">
                  <strong className="text-slate-800 font-mono">{selectedPalabra.texto || "…"}</strong>
                  {acordesSeleccionados.length > 1 && (
                    <span className="ml-1 text-xs text-sky-600">
                      ({acordesSeleccionados.length} acordes)
                    </span>
                  )}
                </span>
                <input
                  type="text"
                  value={acordeInput}
                  onChange={(e) => setAcordeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyAcordeInput();
                  }}
                  placeholder="Acorde"
                  className="px-3 py-1.5 rounded-lg border-2 border-sky-300 focus:border-sky-500 focus:outline-none font-mono text-sm w-28"
                />
                <button
                  type="button"
                  onClick={applyAcordeInput}
                  className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700"
                >
                  Aplicar en letra
                </button>
                <button
                  type="button"
                  onClick={quitarAcordeEnLetra}
                  className="px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100"
                  title="Quita solo el acorde de la letra seleccionada"
                >
                  Quitar letra
                </button>
                <button
                  type="button"
                  onClick={quitarTodosAcordes}
                  className="px-2.5 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100"
                  title="Quita todos los acordes de la palabra"
                >
                  Quitar todos
                </button>
                <span className="text-xs text-slate-500">Letras:</span>
                <div className="flex flex-wrap gap-0.5">
                  {Array.from(selectedPalabra.texto || " ").map((ch, i) => {
                    const acEnI = acordesSeleccionados.find((a) => a.index === i);
                    const active = selectedLetter === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedLetter(i);
                          setAcordeInput(acEnI?.acorde || "");
                        }}
                        className={`min-w-[1.75rem] px-1.5 py-1 rounded font-mono text-sm border transition-all
                          ${
                            active
                              ? "border-sky-500 bg-sky-100 text-sky-900"
                              : acEnI
                                ? "border-sky-300 bg-sky-50"
                                : "border-slate-200 bg-white hover:border-sky-300"
                          }`}
                      >
                        <span className="block text-[9px] text-sky-600 h-2.5 leading-none">
                          {acEnI ? acEnI.acorde : "\u00A0"}
                        </span>
                        {ch}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickChords(!showQuickChords)}
                  className="ml-auto text-xs text-sky-600 hover:underline"
                >
                  {showQuickChords ? "Ocultar" : "Rápidos"}
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-500 py-1">
                Clic en una palabra → elige letra → aplica acorde (puedes repetir en otra letra de la
                misma palabra)
              </p>
            )}
          </div>

          {showQuickChords && selectedWord && (
            <div className="flex flex-wrap gap-1 pb-1">
              {ACORDES_COMUNES.slice(0, 36).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setChordAtLetter(a, selectedLetter)}
                  className="px-2 py-1 rounded bg-sky-50 text-sky-800 text-xs font-mono font-semibold hover:bg-sky-100"
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
