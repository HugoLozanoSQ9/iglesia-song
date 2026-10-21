"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import SongEditor from "@/components/SongEditor";
import {
  isAdminAutenticado,
  getCancion,
  guardarCancion,
  getCategorias,
} from "@/lib/storage";
import { Cancion, Categoria } from "@/types/song";

function EditarContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [cancion, setCancion] = useState<Cancion | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isAdminAutenticado()) {
      router.replace("/admin/login");
      return;
    }
    const c = getCancion(id);
    if (!c) {
      router.replace("/admin");
      return;
    }
    setCancion(c);
    setCategorias(getCategorias());
  }, [router, id]);

  const handleSave = () => {
    if (!cancion) return;
    if (!cancion.titulo.trim()) {
      alert("Ponle un título a la canción");
      return;
    }
    guardarCancion(cancion);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!cancion) {
    return <div className="p-8 text-center text-slate-500">Cargando editor...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Editar canción</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">Categoría:</label>
          <select
            value={cancion.categoria}
            onChange={(e) => setCancion({ ...cancion, categoria: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:outline-none"
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icono} {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg text-center font-medium">
          ¡Guardado correctamente!
        </div>
      )}

      <SongEditor cancion={cancion} onChange={setCancion} onSave={handleSave} />
    </div>
  );
}

export default function EditarCancionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}>
      <EditarContent />
    </Suspense>
  );
}
