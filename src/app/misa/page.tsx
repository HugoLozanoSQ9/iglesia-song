"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMisas, eliminarMisa, isAdminAutenticado } from "@/lib/storage";
import { Misa } from "@/types/song";

export default function MisasPage() {
  const [misas, setMisas] = useState<Misa[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const cargar = () => {
    setMisas(
      getMisas().sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || b.actualizadoEn.localeCompare(a.actualizadoEn))
    );
    setIsAdmin(isAdminAutenticado());
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleEliminar = (id: string, titulo: string) => {
    if (confirm(`¿Eliminar el librito "${titulo}"?`)) {
      eliminarMisa(id);
      cargar();
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Libritos de la misa</h1>
          <p className="text-slate-500 mt-1">
            Arma el orden del día: una canción por cada parte de la misa
          </p>
        </div>
        <Link
          href="/misa/nueva"
          className="px-5 py-3 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 shadow-sm"
        >
          + Nuevo librito
        </Link>
      </div>

      {misas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
          <p className="text-xl mb-2">Aún no hay libritos</p>
          <p className="text-sm">Crea uno para preparar las canciones del domingo.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {misas.map((m) => {
            const seleccionadas = Object.keys(m.seleccion).length;
            return (
              <li
                key={m.id}
                className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 flex flex-wrap items-center justify-between gap-3 hover:border-sky-300 transition-colors"
              >
                <div>
                  <Link
                    href={`/misa/${m.id}`}
                    className="text-lg font-semibold text-slate-800 hover:text-sky-700"
                  >
                    {m.titulo}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {m.fecha ? `Fecha: ${m.fecha}` : "Sin fecha"} · {seleccionadas} canción
                    {seleccionadas !== 1 ? "es" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/misa/${m.id}`}
                    className="px-3 py-1.5 text-sm bg-sky-100 text-sky-800 rounded-lg hover:bg-sky-200"
                  >
                    Ver
                  </Link>
                  <Link
                    href={`/misa/editar/${m.id}`}
                    className="px-3 py-1.5 text-sm bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200"
                  >
                    Editar
                  </Link>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleEliminar(m.id, m.titulo)}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
