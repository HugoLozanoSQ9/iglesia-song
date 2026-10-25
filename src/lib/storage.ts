"use client";

import { Cancion,
  Categoria,
  CATEGORIAS_DEFAULT,
  Misa,
  getAcordesDePalabra, limpiarTexto } from "@/types/song";

const KEY_ADMIN = "iglesia-admin-auth";
const KEY_ADMIN_SECRET = "iglesia-admin-key";

// Caché en memoria (se llena desde los JSON del repo)
let cacheCanciones: Cancion[] | null = null;
let cacheCategorias: Categoria[] | null = null;
let cacheMisas: Misa[] | null = null;
let loadPromise: Promise<void> | null = null;

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/** Carga canciones, categorías y misas desde public/data/*.json */
export async function loadAllData(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const [canciones, categorias, misas] = await Promise.all([
      fetchJson<Cancion[]>("/data/canciones.json", []),
      fetchJson<Categoria[]>("/data/categorias.json", CATEGORIAS_DEFAULT),
      fetchJson<Misa[]>("/data/misas.json", []),
    ]);
    cacheCanciones = canciones;
    cacheCategorias = categorias?.length ? categorias : CATEGORIAS_DEFAULT;
    cacheMisas = misas;
  })();
  await loadPromise;
  loadPromise = null;
}

async function persist(resource: "canciones" | "categorias" | "misas", data: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key =
    typeof window !== "undefined" ? sessionStorage.getItem(KEY_ADMIN_SECRET) || "" : "";
  if (key) headers["x-admin-key"] = key;

  const res = await fetch(`/api/data/${resource}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ||
        "No se pudo guardar el archivo JSON. ¿Estás en local con npm run dev?"
    );
  }
}

// ---- Canciones ----

export function getCanciones(): Cancion[] {
  return cacheCanciones || [];
}

export function getCancionesPorCategoria(categoriaId: string): Cancion[] {
  return getCanciones()
    .filter((c) => c.categoria === categoriaId)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
}

export function getCancion(id: string): Cancion | null {
  return getCanciones().find((c) => c.id === id) || null;
}

export async function guardarCancion(cancion: Cancion): Promise<void> {
  await loadAllData();
  const todas = [...getCanciones()];
  const idx = todas.findIndex((c) => c.id === cancion.id);
  const actualizada: Cancion = {
    ...cancion,
    titulo: limpiarTexto(cancion.titulo),
    lineas: cancion.lineas.map((l) => ({
      palabras: l.palabras.map((p) => ({
        ...p,
        texto: limpiarTexto(p.texto || ""),
      })),
    })),
    actualizadoEn: new Date().toISOString(),
  };
  if (idx >= 0) todas[idx] = actualizada;
  else todas.push(actualizada);
  cacheCanciones = todas;
  await persist("canciones", todas);
}

export async function eliminarCancion(id: string): Promise<void> {
  await loadAllData();
  const filtradas = getCanciones().filter((c) => c.id !== id);
  cacheCanciones = filtradas;
  await persist("canciones", filtradas);
}

// ---- Categorías ----

export function getCategorias(): Categoria[] {
  return cacheCategorias?.length ? cacheCategorias : CATEGORIAS_DEFAULT;
}

export async function guardarCategorias(cats: Categoria[]): Promise<void> {
  cacheCategorias = cats;
  await persist("categorias", cats);
}

export async function agregarCategoria(nombre: string): Promise<Categoria> {
  await loadAllData();
  const actuales = getCategorias();
  const nueva: Categoria = {
    id: nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, ""),
    nombre,
    orden: actuales.length + 1,
    icono: "🎵",
  };
  const actualizadas = [...actuales, nueva];
  await guardarCategorias(actualizadas);
  return nueva;
}

// ---- Misas ----

export function getMisas(): Misa[] {
  return cacheMisas || [];
}

export function getMisa(id: string): Misa | null {
  return getMisas().find((m) => m.id === id) || null;
}

export async function guardarMisa(misa: Misa): Promise<void> {
  await loadAllData();
  const todas = [...getMisas()];
  const idx = todas.findIndex((m) => m.id === misa.id);
  const actualizada = { ...misa, actualizadoEn: new Date().toISOString() };
  if (idx >= 0) todas[idx] = actualizada;
  else todas.push(actualizada);
  cacheMisas = todas;
  await persist("misas", todas);
}

export async function eliminarMisa(id: string): Promise<void> {
  await loadAllData();
  const filtradas = getMisas().filter((m) => m.id !== id);
  cacheMisas = filtradas;
  await persist("misas", filtradas);
}

export function crearMisaVacia(titulo = "Misa del domingo"): Misa {
  return {
    id: generarId(),
    titulo,
    fecha: new Date().toISOString().slice(0, 10),
    seleccion: {},
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  };
}

// ---- Admin (solo UI local; la llave se manda al guardar JSON) ----

export function isAdminAutenticado(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY_ADMIN) === "true";
}

export function loginAdmin(usuario: string, password: string): boolean {
  const userOk = process.env.NEXT_PUBLIC_ADMIN_USER || "admin";
  const passOk = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "iglesia2026";
  if (usuario === userOk && password === passOk) {
    localStorage.setItem(KEY_ADMIN, "true");
    sessionStorage.setItem(KEY_ADMIN_SECRET, password);
    return true;
  }
  return false;
}

export function logoutAdmin(): void {
  localStorage.removeItem(KEY_ADMIN);
  sessionStorage.removeItem(KEY_ADMIN_SECRET);
}

// ---- Helpers ----

export function generarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function crearCancionVacia(categoria: string, titulo = "Nueva canción"): Cancion {
  return {
    id: generarId(),
    titulo,
    categoria,
    lineas: [{ palabras: [{ texto: "" }] }],
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  };
}

export function textoALineas(texto: string): { palabras: { texto: string }[] }[] {
  return texto
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((linea) => ({
      palabras: linea
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => ({ texto: t })),
    }));
}

export function cancionATexto(cancion: Cancion): string {
  const lineasTexto = cancion.lineas.map((linea) => {
    const cParts: string[] = [];
    const lParts: string[] = [];
    linea.palabras.forEach((p) => {
      const texto = p.texto || "";
      const len = Math.max(texto.length, 1);
      const chars = Array.from(" ".repeat(len));
      for (const { acorde, index } of getAcordesDePalabra(p)) {
        const idx = Math.max(0, Math.min(index, Math.max(texto.length - 1, 0)));
        for (let k = 0; k < acorde.length; k++) {
          if (idx + k < chars.length) chars[idx + k] = acorde[k];
          else chars.push(acorde[k]);
        }
      }
      let chordLine = chars.join("");
      const width = Math.max(texto.length, chordLine.length, 1);
      cParts.push(chordLine.padEnd(width));
      lParts.push(texto.padEnd(width));
    });
    const lineaAcordes = cParts.join(" ").trimEnd();
    const lineaLetras = lParts.join(" ").trimEnd();
    return lineaAcordes.trim() ? `${lineaAcordes}\n${lineaLetras}` : lineaLetras;
  });

  return `${cancion.titulo}\n${cancion.categoria.toUpperCase()}\n\n${lineasTexto.join("\n\n")}`;
}
