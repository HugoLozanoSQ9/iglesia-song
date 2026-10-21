import Link from "next/link";
import { Categoria } from "@/types/song";

interface CategoryCardProps {
  categoria: Categoria;
  count?: number;
}

export default function CategoryCard({ categoria, count = 0 }: CategoryCardProps) {
  return (
    <Link
      href={`/categoria/${categoria.id}`}
      className="group flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl bg-white border-2 border-slate-100 shadow-sm
                 hover:border-sky-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
                 focus:outline-none focus:ring-4 focus:ring-sky-200 min-h-[140px]"
    >
      <span className="text-4xl md:text-5xl mb-3 group-hover:scale-110 transition-transform">
        {categoria.icono || "🎵"}
      </span>
      <h2 className="text-lg md:text-xl font-semibold text-slate-800 text-center leading-tight">
        {categoria.nombre}
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        {count === 0 ? "Sin canciones" : `${count} canción${count !== 1 ? "es" : ""}`}
      </p>
    </Link>
  );
}
