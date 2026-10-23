"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getMisa, getCancion, getCategorias, loadAllData } from "@/lib/storage";
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

  useEffect(() => {
    loadAllData().then(() => {
    const m = getMisa(id);
    setMisa(m);
    const cats = getCategorias().sort((a, b) => a.orden - b.orden);
    setCategorias(cats);
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

  const handlePDF = async () => {
    await descargarMisaPDF(misa);
  };

  const cancionActual = cancionActiva ? canciones[cancionActiva] : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/misa" className="text-sky-600 hover:underline text-sm">
          ← Todos los libritos
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/misa/editar/${misa.id}`}
            className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-200"
          >
            ✏️ Cambiar canciones
          </Link>
          <button
            type="button"
            onClick={handlePDF}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700"
          >
            📄 Descargar PDF
          </button>
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800">{misa.titulo}</h1>
        {misa.fecha && <p className="text-slate-500 mt-1 text-lg">{misa.fecha}</p>}
      </div>

      {/* Tabs */}
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
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icono}</span>
                  <div>
                    <p className="text-sm text-slate-500">{cat.nombre}</p>
                    <p className="font-semibold text-slate-800">
                      {cancion ? cancion.titulo : "— sin canción —"}
                    </p>
                  </div>
                </div>
                {cancion && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancionActiva(cancion.id);
                      setVista("cancion");
                    }}
                    className="px-3 py-1.5 text-sm bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100"
                  >
                    Ver letra →
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {vista === "cancion" && cancionActual && (
        <div>
          <button
            type="button"
            onClick={() => setVista("orden")}
            className="text-sky-600 hover:underline text-sm mb-4"
          >
            ← Volver al orden
          </button>
          <SongViewer cancion={cancionActual} />
        </div>
      )}
    </div>
  );
}

export default function MisaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando librito...</div>}>
      <MisaContent />
    </Suspense>
  );
}
