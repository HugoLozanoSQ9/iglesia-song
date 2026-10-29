"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getMisa,
  getCancion,
  getCategorias,
  loadAllData,
  isAdminAutenticado,
} from "@/lib/storage";
import { descargarMisaPDF } from "@/lib/pdf";
import { Cancion, Categoria, Misa } from "@/types/song";
import SongViewer from "@/components/SongViewer";

function MisaContent() {
  const params = useParams();
  const id = params.id as string;

  const [misa, setMisa] = useState<Misa | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [canciones, setCanciones] = useState<Record<string, Cancion>>({});
  const [vista, setVista] = useState<"orden" | "cancion">("orden");
  const [cancionActiva, setCancionActiva] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadAllData().then(() => {
      const m = getMisa(id);
      setMisa(m);
      const cats = getCategorias().sort((a, b) => a.orden - b.orden);
      setCategorias(cats);
      setIsAdmin(isAdminAutenticado());
      if (m) {
        const map: Record<string, Cancion> = {};
        Object.values(m.seleccion).forEach((cid) => {
          const c = getCancion(cid);
          if (c) map[cid] = c;
        });
        setCanciones(map);
      }
    });
  }, [id]);

  /** Canciones en el orden de las categorías de la misa */
  const ordenCanciones = useMemo(() => {
    if (!misa) return [] as { cat: Categoria; cancion: Cancion }[];
    const list: { cat: Categoria; cancion: Cancion }[] = [];
    for (const cat of categorias) {
      const cid = misa.seleccion[cat.id];
      if (cid && canciones[cid]) {
        list.push({ cat, cancion: canciones[cid] });
      }
    }
    return list;
  }, [misa, categorias, canciones]);

  const indiceActual = useMemo(() => {
    if (!cancionActiva) return -1;
    return ordenCanciones.findIndex((x) => x.cancion.id === cancionActiva);
  }, [ordenCanciones, cancionActiva]);

  const irA = (idx: number) => {
    if (idx < 0 || idx >= ordenCanciones.length) return;
    setCancionActiva(ordenCanciones[idx].cancion.id);
    setVista("cancion");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!misa) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-xl text-slate-600">Librito no encontrado</p>
        <Link href="/misa" className="mt-4 inline-block text-sky-600 hover:underline">
          Volver
        </Link>
      </div>
    );
  }

  const handlePDF = async (soloLetra = false) => {
    await descargarMisaPDF(misa, { soloLetra });
  };

  const cancionActual = cancionActiva ? canciones[cancionActiva] : null;
  const catActual =
    indiceActual >= 0 ? ordenCanciones[indiceActual]?.cat : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/misa" className="text-sky-600 hover:underline text-sm">
          ← Todos los libritos
        </Link>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Link
              href={`/misa/editar/${misa.id}`}
              className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-200"
            >
              ✏️ Cambiar canciones
            </Link>
          )}
          <button
            type="button"
            onClick={() => handlePDF(false)}
            className="px-5 py-2.5 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700"
          >
            📄 PDF con acordes
          </button>
          <button
            type="button"
            onClick={() => handlePDF(true)}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
          >
            📝 PDF solo letra
          </button>
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800">{misa.titulo}</h1>
        {misa.fecha && <p className="text-slate-500 mt-1 text-lg">{misa.fecha}</p>}
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => {
            setVista("orden");
            setCancionActiva(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            vista === "orden" ? "bg-sky-100 text-sky-800" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Orden de la misa
        </button>
        {cancionActual && (
          <button
            type="button"
            onClick={() => setVista("cancion")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              vista === "cancion" ? "bg-sky-100 text-sky-800" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Ver canción
          </button>
        )}
      </div>

      {vista === "orden" && (
        <ul className="space-y-3">
          {categorias.map((cat) => {
            const cid = misa.seleccion[cat.id];
            const cancion = cid ? canciones[cid] : null;
            return (
              <li
                key={cat.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm text-slate-500">
                    {cat.icono} {cat.nombre}
                  </p>
                  <p className="font-semibold text-slate-800">
                    {cancion ? cancion.titulo : (
                      <span className="text-slate-400 font-normal">Sin canción</span>
                    )}
                  </p>
                </div>
                {cancion && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancionActiva(cancion.id);
                      setVista("cancion");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700"
                  >
                    Ver →
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {vista === "cancion" && cancionActual && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setVista("orden")}
              className="text-sky-600 hover:underline text-sm"
            >
              ← Volver al orden
            </button>
            {catActual && (
              <span className="text-sm text-slate-500">
                {catActual.icono} {catActual.nombre}
                {indiceActual >= 0 && (
                  <span className="ml-2 text-slate-400">
                    ({indiceActual + 1}/{ordenCanciones.length})
                  </span>
                )}
              </span>
            )}
          </div>

          <SongViewer cancion={cancionActual} showDownload={true} />

          {/* Navegación siguiente / anterior */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 sticky bottom-4 bg-white/95 backdrop-blur border border-slate-200 shadow-lg rounded-2xl p-3">
            <button
              type="button"
              disabled={indiceActual <= 0}
              onClick={() => irA(indiceActual - 1)}
              className="px-5 py-3 rounded-xl text-sm font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => setVista("orden")}
              className="px-4 py-2 text-sm text-slate-500 hover:text-sky-700"
            >
              Orden
            </button>
            <button
              type="button"
              disabled={indiceActual < 0 || indiceActual >= ordenCanciones.length - 1}
              onClick={() => irA(indiceActual + 1)}
              className="px-5 py-3 rounded-xl text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          </div>

          {indiceActual >= 0 && indiceActual < ordenCanciones.length - 1 && (
            <p className="text-center text-xs text-slate-400 mt-2">
              Siguiente: {ordenCanciones[indiceActual + 1].cat.nombre} —{" "}
              {ordenCanciones[indiceActual + 1].cancion.titulo}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function MisaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando…</div>}>
      <MisaContent />
    </Suspense>
  );
}
