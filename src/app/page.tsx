"use client";

import { useEffect, useState } from "react";
import CategoryCard from "@/components/CategoryCard";
import { getCategorias, getCanciones, loadAllData } from "@/lib/storage";
import { Categoria } from "@/types/song";

export default function HomePage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadAllData().then(() => {
      const cats = getCategorias();
      setCategorias(cats);
      const canciones = getCanciones();
      const c: Record<string, number> = {};
      cats.forEach((cat) => {
        c[cat.id] = canciones.filter((s) => s.categoria === cat.id).length;
      });
      setCounts(c);
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-5xl font-bold text-slate-800 mb-3">
          Cancionero Parroquial
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
          Selecciona una parte de la misa para ver las canciones disponibles
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {categorias.map((cat) => (
          <CategoryCard key={cat.id} categoria={cat} count={counts[cat.id] || 0} />
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-slate-500 text-sm">
          ¿Eres administrador?{" "}
          <a href="/admin/login" className="text-sky-600 hover:underline font-medium">
            Inicia sesión aquí
          </a>
        </p>
      </div>
    </div>
  );
}
