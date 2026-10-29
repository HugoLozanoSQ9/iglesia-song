"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  isAdminAutenticado,
  getCategorias,
  guardarCategorias,
  agregarCategoria,
  loadAllData,
} from "@/lib/storage";
import { Categoria } from "@/types/song";

export default function AdminCategoriasPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nuevaCat, setNuevaCat] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const cargar = async () => {
    await loadAllData();
    setCategorias(getCategorias().sort((a, b) => a.orden - b.orden));
  };

  useEffect(() => {
    if (!isAdminAutenticado()) {
      router.replace("/admin/login");
      return;
    }
    void cargar();
  }, [router]);

  const renumerar = (lista: Categoria[]) =>
    lista.map((c, i) => ({ ...c, orden: i + 1 }));

  const persistir = async (lista: Categoria[]) => {
    setSaving(true);
    setMsg("");
    try {
      const ordenada = renumerar(lista);
      await guardarCategorias(ordenada);
      setCategorias(ordenada);
      setMsg("Orden guardado");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const mover = async (index: number, dir: -1 | 1) => {
    const nuevo = index + dir;
    if (nuevo < 0 || nuevo >= categorias.length) return;
    const copia = [...categorias];
    const tmp = copia[index];
    copia[index] = copia[nuevo];
    copia[nuevo] = tmp;
    await persistir(copia);
  };

  const handleAdd = async () => {
    if (!nuevaCat.trim()) return;
    try {
      await agregarCategoria(nuevaCat.trim());
      setNuevaCat("");
      await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al agregar");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin" className="text-sky-600 hover:underline text-sm">
          ← Volver al panel
        </Link>
        <h1 className="text-3xl font-bold text-slate-800 mt-2">Categorías</h1>
        <p className="text-slate-500 mt-1">
          Usa las flechas para acomodar el orden. Así se verán en el inicio y en los libritos.
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={nuevaCat}
          onChange={(e) => setNuevaCat(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nueva categoría..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-2.5 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700"
        >
          Agregar
        </button>
      </div>

      {msg && <p className="mb-3 text-sm text-emerald-600 font-medium">{msg}</p>}

      <ul className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm">
        {categorias.map((cat, index) => (
          <li key={cat.id} className="flex items-center gap-3 p-4 hover:bg-slate-50">
            <span className="w-8 text-center text-sm font-mono text-slate-400">{cat.orden}</span>
            <span className="text-xl">{cat.icono || "🎵"}</span>
            <span className="flex-1 font-medium text-slate-800">{cat.nombre}</span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={index === 0 || saving}
                onClick={() => mover(index, -1)}
                className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-sky-100 hover:text-sky-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Subir"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === categorias.length - 1 || saving}
                onClick={() => mover(index, 1)}
                className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-sky-100 hover:text-sky-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Bajar"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>

      {categorias.length === 0 && (
        <p className="text-center text-slate-500 mt-8">No hay categorías aún.</p>
      )}
    </div>
  );
}
