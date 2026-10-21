"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin, isAdminAutenticado } from "@/lib/storage";

export default function AdminLoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAdminAutenticado()) {
      router.replace("/admin");
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (loginAdmin(usuario, password)) {
      router.push("/admin");
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="text-center mb-8">
          <span className="text-5xl">🔐</span>
          <h1 className="text-2xl font-bold text-slate-800 mt-3">Acceso Admin</h1>
          <p className="text-slate-500 mt-1">Solo para administradores del cancionero</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none text-lg"
              placeholder="admin"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none text-lg"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-sky-600 text-white rounded-xl font-semibold text-lg hover:bg-sky-700 shadow-md active:scale-[0.98] transition-all"
          >
            Entrar
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Credenciales por defecto: <strong>admin</strong> / <strong>iglesia2026</strong>
        </p>
      </div>
    </div>
  );
}
