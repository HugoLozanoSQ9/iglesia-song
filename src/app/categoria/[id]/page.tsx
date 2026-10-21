"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCategorias, getCancionesPorCategoria, isAdminAutenticado } from "@/lib/storage";
import { Cancion, Categoria } from "@/types/song";

function CategoriaContent() {
  const params = useParams();
  const id = params.id as string;

  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [canciones, setCanciones] = useState<Cancion[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const cats = getCategorias();
    const cat = cats.find((c) => c.id === id) || null;
    setCategoria(cat);
    setCanciones(getCancionesPorCategoria(id));
    setIsAdmin(isAdminAutenticado());
  }, [id]);

  if (!categoria) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-xl text-slate-600">Categoría no encontrada</p>
        <Link href="/" className="mt-4 inline-block text-sky-600 hover:underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/" className="text-sky-600 hover:underline text-sm mb-2 inline-block">
          ← Volver a categorías
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 flex items-center gap-3">
          <span>{categoria.icono}</span> {categoria.nombre}
        </h1>
      </div>

      {isAdmin && (
        <div className="mb-6">
          <Link
            href={`/admin/nueva?categoria=${id}`}
            className="inline-flex items-center gap-2 px-5 py-3 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 shadow-sm"
          >
            + Nueva canción en {categoria.nombre}
          </Link>
        </div>
      )}

      {canciones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <p className="text-xl text-slate-500 mb-2">Aún no hay canciones en esta categoría</p>
          <p className="text-slate-400">
            {isAdmin
              ? "¡Sé el primero en agregar una!"
              : "El administrador agregará canciones pronto."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {canciones.map((c) => (
            <li key={c.id}>
              <Link
                href={`/cancion/${c.id}`}
                className="flex items-center justify-between p-4 md:p-5 bg-white rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all group"
              >
                <span className="text-lg md:text-xl font-medium text-slate-800 group-hover:text-sky-700">
                  {c.titulo}
                </span>
                <span className="text-slate-400 group-hover:text-sky-500">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CategoriaPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-500">Cargando categoría...</div>}>
      <CategoriaContent />
    </Suspense>
  );
}
