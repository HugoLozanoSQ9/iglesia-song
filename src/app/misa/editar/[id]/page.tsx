"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getCategorias,
  getCancionesPorCategoria,
  getMisa,
  guardarMisa,
} from "@/lib/storage";
import { Cancion, Categoria, Misa } from "@/types/song";

function EditarMisaContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [misa, setMisa] = useState<Misa | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cancionesPorCat, setCancionesPorCat] = useState<Record<string, Cancion[]>>({});

  useEffect(() => {
    const m = getMisa(id);
    if (!m) {
      router.replace("/misa");
      return;
    }
    setMisa(m);
    const cats = getCategorias().sort((a, b) => a.orden - b.orden);
    setCategorias(cats);
    const map: Record<string, Cancion[]> = {};
    cats.forEach((c) => {
      map[c.id] = getCancionesPorCategoria(c.id);
    });
    setCancionesPorCat(map);
  }, [id, router]);

  const setSeleccion = (catId: string, cancionId: string) => {
    if (!misa) return;
    const seleccion = { ...misa.seleccion };
    if (cancionId) {
      seleccion[catId] = cancionId;
    } else {
      delete seleccion[catId];
    }
    setMisa({ ...misa, seleccion });
  };

  const handleSave = () => {
    if (!misa) return;
    if (!misa.titulo.trim()) {
      alert("Ponle un título al librito");
      return;
    }
    guardarMisa(misa);
    router.push(`/misa/${misa.id}`);
  };

  if (!misa) {
    return <div className="p-8 text-center text-slate-500">Cargando...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href={`/misa/${misa.id}`} className="text-sky-600 hover:underline text-sm mb-4 inline-block">
        ← Volver al librito
      </Link>

      <h1 className="text-3xl font-bold text-slate-800 mb-6">Editar librito</h1>

      <div className="space-y-5 mb-8">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
          <input
            type="text"
            value={misa.titulo}
            onChange={(e) => setMisa({ ...misa, titulo: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none text-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
          <input
            type="date"
            value={misa.fecha || ""}
            onChange={(e) => setMisa({ ...misa, fecha: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      <h2 className="text-xl font-semibold text-slate-700 mb-4">Canciones por parte</h2>

      <div className="space-y-4">
        {categorias.map((cat) => {
          const opciones = cancionesPorCat[cat.id] || [];
          return (
            <div
              key={cat.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="sm:w-44 shrink-0 font-medium text-slate-800">
                {cat.icono} {cat.nombre}
              </div>
              <select
                value={misa.seleccion[cat.id] || ""}
                onChange={(e) => setSeleccion(cat.id, e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-lg border border-slate-300 focus:border-sky-500 focus:outline-none bg-white"
              >
                <option value="">— Sin seleccionar —</option>
                {opciones.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titulo}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex gap-3 justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="px-6 py-3 bg-sky-600 text-white rounded-xl font-semibold hover:bg-sky-700 shadow-sm"
        >
          💾 Guardar cambios
        </button>
      </div>
    </div>
  );
}

export default function EditarMisaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}>
      <EditarMisaContent />
    </Suspense>
  );
}
