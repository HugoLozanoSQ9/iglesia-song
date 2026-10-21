"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  isAdminAutenticado,
  getCanciones,
  getCategorias,
  eliminarCancion,
  agregarCategoria,
} from "@/lib/storage";
import { Cancion, Categoria } from "@/types/song";

export default function AdminPage() {
  const router = useRouter();
  const [canciones, setCanciones] = useState<Cancion[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nuevaCat, setNuevaCat] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);

  const cargar = () => {
    setCanciones(getCanciones().sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn)));
    setCategorias(getCategorias());
  };

  useEffect(() => {
    if (!isAdminAutenticado()) {
      router.replace("/admin/login");
      return;
    }
    cargar();
  }, [router]);

  const handleEliminar = (id: string, titulo: string) => {
    if (confirm(`¿Eliminar la canción "${titulo}"?`)) {
      eliminarCancion(id);
      cargar();
    }
  };

  const handleAddCategoria = () => {
    if (!nuevaCat.trim()) return;
    agregarCategoria(nuevaCat.trim());
    setNuevaCat("");
    setShowAddCat(false);
    cargar();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Panel de Administración</h1>
        <Link
          href="/admin/nueva"
          className="px-5 py-3 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 shadow-sm"
        >
          + Nueva canción
        </Link>
      </div>

      {/* Categorías */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-700">Categorías</h2>
          <button
            onClick={() => setShowAddCat(!showAddCat)}
            className="text-sm text-sky-600 hover:underline"
          >
            {showAddCat ? "Cancelar" : "+ Agregar categoría"}
          </button>
        </div>

        {showAddCat && (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={nuevaCat}
              onChange={(e) => setNuevaCat(e.target.value)}
              placeholder="Nombre de la nueva categoría"
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:outline-none"
            />
            <button
              onClick={handleAddCategoria}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg font-medium"
            >
              Guardar
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <span
              key={c.id}
              className="px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700"
            >
              {c.icono} {c.nombre}
            </span>
          ))}
        </div>
      </section>

      {/* Lista de canciones */}
      <section>
        <h2 className="text-xl font-semibold text-slate-700 mb-4">
          Todas las canciones ({canciones.length})
        </h2>

        {canciones.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
            No hay canciones todavía. ¡Crea la primera!
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {canciones.map((c) => {
                const cat = categorias.find((cat) => cat.id === c.categoria);
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{c.titulo}</p>
                      <p className="text-sm text-slate-500">
                        {cat?.icono} {cat?.nombre || c.categoria}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/cancion/${c.id}`}
                        className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg hover:bg-slate-200"
                      >
                        Ver
                      </Link>
                      <Link
                        href={`/admin/editar/${c.id}`}
                        className="px-3 py-1.5 text-sm bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleEliminar(c.id, c.titulo)}
                        className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
