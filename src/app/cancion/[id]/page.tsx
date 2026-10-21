"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SongViewer from "@/components/SongViewer";
import { getCancion, isAdminAutenticado } from "@/lib/storage";
import { Cancion } from "@/types/song";

function CancionContent() {
  const params = useParams();
  const id = params.id as string;

  const [cancion, setCancion] = useState<Cancion | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setCancion(getCancion(id));
    setIsAdmin(isAdminAutenticado());
  }, [id]);

  if (!cancion) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-xl text-slate-600">Canción no encontrada</p>
        <Link href="/" className="mt-4 inline-block text-sky-600 hover:underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/categoria/${cancion.categoria}`}
          className="text-sky-600 hover:underline text-sm"
        >
          ← Volver a la categoría
        </Link>

        {isAdmin && (
          <Link
            href={`/admin/editar/${cancion.id}`}
            className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg font-medium hover:bg-amber-200 text-sm"
          >
            ✏️ Editar
          </Link>
        )}
      </div>

      <SongViewer cancion={cancion} />
    </div>
  );
}

export default function CancionPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-500">Cargando canción...</div>}>
      <CancionContent />
    </Suspense>
  );
}
