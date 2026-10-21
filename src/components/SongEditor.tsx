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

/** Una palabra: rejilla 1 columna por letra. El acorde empieza exactamente en acordeIndex. */
function PalabraGrid({
  texto,
  acorde,
  acordeIndex = 0,
  selected,
  onSelect,
  onChangeTexto,
}: {
  texto: string;
  acorde?: string;
  acordeIndex?: number;
  selected: boolean;
  onSelect: () => void;
  onChangeTexto: (t: string) => void;
}) {
  const letters = Array.from(texto || " ");
  const aidx = Math.max(0, Math.min(acordeIndex, Math.max(letters.length - 1, 0)));

  return (
    <div
      className={`inline-block font-mono mx-0.5 rounded ${
        selected ? "ring-2 ring-sky-400 bg-sky-50" : acorde ? "bg-sky-50/50" : ""
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
              {acorde && i === aidx && (
                <span className="absolute left-0 top-0 text-sky-700 font-bold text-[11px] leading-none whitespace-nowrap z-10">
                  {acorde}
                </span>
              )}
            </span>
            <span className="text-lg leading-tight text-slate-900 select-none">{ch === " " ? "\u00A0" : ch}</span>
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
  const [selectedWord, setSelectedWord] = useState<{ lineaIdx: number; palabraIdx: number } | null>(null);
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
    const palabra = cancion.lineas[lineaIdx]?.palabras[palabraIdx];
    setAcordeInput(palabra?.acorde || "");
  };

  const assignChord = useCallback(
    (acorde: string, index?: number) => {
      if (!selectedWord) return;
      const { lineaIdx, palabraIdx } = selectedWord;
      const nuevasLineas = cancion.lineas.map((linea, li) => {
        if (li !== lineaIdx) return linea;
        return {
          palabras: linea.palabras.map((p, pi) => {
            if (pi !== palabraIdx) return p;
            if (!acorde) return { texto: p.texto };
            const maxIdx = Math.max(0, (p.texto || "").length - 1);
            const acordeIndex =
              index !== undefined
                ? Math.max(0, Math.min(index, maxIdx))
                : Math.min(p.acordeIndex ?? 0, maxIdx);
            return { ...p, acorde, acordeIndex };
          }),
        };
      });
      applyChange({ ...cancion, lineas: nuevasLineas });
      setAcordeInput(acorde);
    },
    [selectedWord, cancion, applyChange]
  );

  const setAcordeIndex = (index: number) => {
    if (!selectedWord) return;
    const p = cancion.lineas[selectedWord.lineaIdx]?.palabras[selectedWord.palabraIdx];
    const ac = p?.acorde || acordeInput.trim();
    if (!ac) {
      alert("Primero escribe un acorde y pulsa Aplicar");
      return;
    }
    assignChord(ac, index);
  };

  const updatePalabraTexto = (lineaIdx: number, palabraIdx: number, texto: string) => {
    applyChange({
      ...cancion,
      lineas: cancion.lineas.map((linea, li) => {
        if (li !== lineaIdx) return linea;
        return {
          palabras: linea.palabras.map((p, pi) => {
            if (pi !== palabraIdx) return p;
            const maxIdx = Math.max(0, texto.length - 1);
            const acordeIndex =
              p.acordeIndex !== undefined ? Math.min(p.acordeIndex, maxIdx) : 0;
            return { ...p, texto, acordeIndex };
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
    clipboardRef.current = JSON.parse(
      JSON.stringify(cancion.lineas.slice(range.from, range.to + 1))
    );
    return true;
  }, [cancion.lineas, selStart, selEnd]);

  const pasteLines = useCallback(() => {
    if (!clipboardRef.current?.length) return false;
    const insertAt = selEnd !== null ? selEnd + 1 : cancion.lineas.length;
    const nuevas = [...cancion.lineas];
    nuevas.splice(insertAt, 0, ...JSON.parse(JSON.stringify(clipboardRef.current)));
    applyChange({ ...cancion, lineas: nuevas });
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
    setCoros((prev) => [...prev, { id: `${Date.now()}`, nombre, lineas }]);
  };

  const insertarCoro = (coro: CoroGuardado) => {
    const insertAt = selEnd !== null ? selEnd + 1 : cancion.lineas.length;
    const nuevas = [...cancion.lineas];
    nuevas.splice(insertAt, 0, ...JSON.parse(JSON.stringify(coro.lineas)));
    applyChange({ ...cancion, lineas: nuevas });
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
      if (mod && e.key === "v" && clipboardRef.current?.length && selStart !== null) {
        if (pasteLines()) e.preventDefault();
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

      <div
        onPaste={handlePasteText}
        className="bg-white rounded-2xl border-2 border-slate-200 p-4 md:p-6 shadow-sm min-h-[300px]"
      >
        <p className="text-sm text-slate-500 mb-4">
          Clic en una <strong>palabra</strong> → acorde abajo → clic en la <strong>letra</strong>. Cada
          letra es una columna fija (así el acorde no se desvía).
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
                      acorde={palabra.acorde}
                      acordeIndex={palabra.acordeIndex ?? 0}
                      selected={
                        selectedWord?.lineaIdx === lineaIdx &&
                        selectedWord?.palabraIdx === palabraIdx
                      }
                      onSelect={() => selectWord(lineaIdx, palabraIdx)}
                      onChangeTexto={(t) => updatePalabraTexto(lineaIdx, palabraIdx, t)}
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
              <span className="text-xs text-violet-700 font-medium ml-auto">
                Líneas {range.from + 1}–{range.to + 1}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedPalabra ? (
              <>
                <span className="text-sm text-slate-600 shrink-0">
                  <strong className="text-slate-800 font-mono">{selectedPalabra.texto || "…"}</strong>
                </span>
                <input
                  type="text"
                  value={acordeInput}
                  onChange={(e) => setAcordeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") assignChord(acordeInput.trim());
                  }}
                  placeholder="Acorde"
                  className="px-3 py-1.5 rounded-lg border-2 border-sky-300 focus:border-sky-500 focus:outline-none font-mono text-sm w-28"
                />
                <button
                  type="button"
                  onClick={() => assignChord(acordeInput.trim())}
                  className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700"
                >
                  Aplicar
                </button>
                <button
                  type="button"
                  onClick={() => assignChord("")}
                  className="px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100"
                >
                  Quitar
                </button>
                <span className="text-xs text-slate-500">Letra:</span>
                <div className="flex flex-wrap gap-0.5">
                  {Array.from(selectedPalabra.texto || " ").map((ch, i) => {
                    const active = (selectedPalabra.acordeIndex ?? 0) === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAcordeIndex(i)}
                        className={`min-w-[1.75rem] px-1.5 py-1 rounded font-mono text-sm border transition-all
                          ${
                            active
                              ? "border-sky-500 bg-sky-100 text-sky-900"
                              : "border-slate-200 bg-white hover:border-sky-300"
                          }`}
                      >
                        <span className="block text-[9px] text-sky-600 h-2.5 leading-none">
                          {active && selectedPalabra.acorde ? selectedPalabra.acorde : "\u00A0"}
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
                Clic en una palabra para editar su acorde y la letra donde va
              </p>
            )}
          </div>

          {showQuickChords && selectedWord && (
            <div className="flex flex-wrap gap-1 pb-1">
              {ACORDES_COMUNES.slice(0, 36).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => assignChord(a)}
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
