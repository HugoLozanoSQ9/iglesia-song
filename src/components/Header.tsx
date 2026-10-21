"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAdminAutenticado, logoutAdmin } from "@/lib/storage";
import { useEffect, useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(isAdminAutenticado());
  }, [pathname]);

  const handleLogout = () => {
    logoutAdmin();
    setIsAdmin(false);
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">⛪</span>
          <span className="font-bold text-xl text-slate-800 group-hover:text-sky-700 transition-colors">
            Cancionero
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${pathname === "/" ? "bg-sky-100 text-sky-800" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Inicio
          </Link>

          {isAdmin ? (
            <>
              <Link
                href="/admin"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${pathname.startsWith("/admin") ? "bg-sky-100 text-sky-800" : "text-slate-600 hover:bg-slate-100"}`}
              >
                Admin
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Salir
              </button>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
