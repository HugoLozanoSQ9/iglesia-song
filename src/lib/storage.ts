"use client";

import {
  Cancion,
  Categoria,
  CATEGORIAS_DEFAULT,
  Misa,
  getAcordesDePalabra,
  limpiarTexto,
} from "@/types/song";
import { getSupabase, hasSupabase } from "@/lib/supabase";

const KEY_ADMIN = "iglesia-admin-auth";
const KEY_ADMIN_SECRET = "iglesia-admin-key";

let cacheCanciones: Cancion[] | null = null;
let cacheCategorias: Categoria[] | null = null;
let cacheMisas: Misa[] | null = null;
let loadPromise: Promise<void> | null = null;

// ---- Mapeo filas DB ↔ app ----

function rowToCancion(row: Record<string, unknown>): Cancion {
  return {
    id: String(row.id),
    titulo: String(row.titulo || ""),
    categoria: String(row.categoria || ""),
    lineas: (row.lineas as Cancion["lineas"]) || [],
    tonalidad: (row.tonalidad as string) || undefined,
    autor: (row.autor as string) || undefined,
    creadoEn: String(row.creado_en || row.creadoEn || new Date().toISOString()),
    actualizadoEn: String(row.actualizado_en || row.actualizadoEn || new Date().toISOString()),
  };
}

function cancionToRow(c: Cancion) {
  return {
    id: c.id,
    titulo: limpiarTexto(c.titulo),
    categoria: c.categoria,
    lineas: c.lineas.map((l) => ({
      palabras: l.palabras.map((p) => ({
        ...p,
        texto: limpiarTexto(p.texto || ""),
      })),
    })),
    tonalidad: c.tonalidad || null,
    autor: c.autor || null,
    creado_en: c.creadoEn || new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
  };
}

function rowToCategoria(row: Record<string, unknown>): Categoria {
  return {
    id: String(row.id),
    nombre: String(row.nombre || ""),
    orden: Number(row.orden ?? 0),
    icono: (row.icono as string) || "🎵",
  };
}

function rowToMisa(row: Record<string, unknown>): Misa {
  return {
    id: String(row.id),
    titulo: String(row.titulo || ""),
    fecha: (row.fecha as string) || undefined,
    seleccion: (row.seleccion as Record<string, string>) || {},
    creadoEn: String(row.creado_en || new Date().toISOString()),
    actualizadoEn: String(row.actualizado_en || new Date().toISOString()),
  };
}

function misaToRow(m: Misa) {
  return {
    id: m.id,
    titulo: m.titulo,
    fecha: m.fecha || null,
    seleccion: m.seleccion || {},
    creado_en: m.creadoEn || new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
  };
}

async function fetchJsonFile<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/** Carga desde tablas normalizadas de Supabase; si falla, JSON local. */
export async function loadAllData(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const sb = getSupabase();
    if (sb && hasSupabase()) {
      try {
        const [catRes, canRes, misRes] = await Promise.all([
          sb.from("categorias").select("*").order("orden", { ascending: true }),
          sb.from("canciones").select("*").order("titulo", { ascending: true }),
          sb.from("misas").select("*").order("fecha", { ascending: false }),
        ]);

        // Si las tablas v2 no existen, intenta esquema viejo app_data
        if (catRes.error || canRes.error) {
          const legacy = await sb.from("app_data").select("key, data");
          if (!legacy.error && legacy.data?.length) {
            const map = Object.fromEntries(legacy.data.map((r) => [r.key, r.data]));
            cacheCanciones = (map.canciones as Cancion[]) || [];
            cacheCategorias =
              ((map.categorias as Categoria[]) || []).length > 0
                ? (map.categorias as Categoria[])
                : CATEGORIAS_DEFAULT;
            cacheMisas = (map.misas as Misa[]) || [];
            loadPromise = null;
            return;
          }
          console.warn("Supabase:", catRes.error?.message || canRes.error?.message);
        } else {
          cacheCategorias =
            (catRes.data || []).map(rowToCategoria).length > 0
              ? (catRes.data || []).map(rowToCategoria)
              : CATEGORIAS_DEFAULT;
          cacheCanciones = (canRes.data || []).map(rowToCancion);
          cacheMisas = (misRes.data || []).map(rowToMisa);
          loadPromise = null;
          return;
        }
      } catch (e) {
        console.warn("Supabase load error", e);
      }
    }

    const [canciones, categorias, misas] = await Promise.all([
      fetchJsonFile<Cancion[]>("/data/canciones.json", []),
      fetchJsonFile<Categoria[]>("/data/categorias.json", CATEGORIAS_DEFAULT),
      fetchJsonFile<Misa[]>("/data/misas.json", []),
    ]);
    cacheCanciones = canciones;
    cacheCategorias = categorias?.length ? categorias : CATEGORIAS_DEFAULT;
    cacheMisas = misas;
  })();
  await loadPromise;
  loadPromise = null;
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

  const sb = getSupabase();
  if (sb && hasSupabase()) {
    const { error } = await sb.from("canciones").upsert(cancionToRow(actualizada), {
      onConflict: "id",
    });
    if (error) throw new Error(`Supabase canciones: ${error.message}`);
  } else {
    await persistLocal("canciones", (() => {
      const todas = [...getCanciones()];
      const idx = todas.findIndex((c) => c.id === actualizada.id);
      if (idx >= 0) todas[idx] = actualizada;
      else todas.push(actualizada);
      return todas;
    })());
  }

  const todas = [...getCanciones()];
  const idx = todas.findIndex((c) => c.id === actualizada.id);
  if (idx >= 0) todas[idx] = actualizada;
  else todas.push(actualizada);
  cacheCanciones = todas;
}

export async function eliminarCancion(id: string): Promise<void> {
  await loadAllData();
  const sb = getSupabase();
  if (sb && hasSupabase()) {
    const { error } = await sb.from("canciones").delete().eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    await persistLocal(
      "canciones",
      getCanciones().filter((c) => c.id !== id)
    );
  }
  cacheCanciones = getCanciones().filter((c) => c.id !== id);
}

// ---- Categorías ----

export function getCategorias(): Categoria[] {
  return cacheCategorias?.length ? cacheCategorias : CATEGORIAS_DEFAULT;
}

export async function guardarCategorias(cats: Categoria[]): Promise<void> {
  const sb = getSupabase();
  if (sb && hasSupabase()) {
    const rows = cats.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      orden: c.orden,
      icono: c.icono || "🎵",
    }));
    const { error } = await sb.from("categorias").upsert(rows, { onConflict: "id" });
    if (error) throw new Error(error.message);
  } else {
    await persistLocal("categorias", cats);
  }
  cacheCategorias = cats;
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
  await guardarCategorias([...actuales, nueva]);
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
  const actualizada = { ...misa, actualizadoEn: new Date().toISOString() };
  const sb = getSupabase();
  if (sb && hasSupabase()) {
    const { error } = await sb.from("misas").upsert(misaToRow(actualizada), {
      onConflict: "id",
    });
    if (error) throw new Error(error.message);
  } else {
    const todas = [...getMisas()];
    const idx = todas.findIndex((m) => m.id === actualizada.id);
    if (idx >= 0) todas[idx] = actualizada;
    else todas.push(actualizada);
    await persistLocal("misas", todas);
  }
  const todas = [...getMisas()];
  const idx = todas.findIndex((m) => m.id === actualizada.id);
  if (idx >= 0) todas[idx] = actualizada;
  else todas.push(actualizada);
  cacheMisas = todas;
}

export async function eliminarMisa(id: string): Promise<void> {
  await loadAllData();
  const sb = getSupabase();
  if (sb && hasSupabase()) {
    const { error } = await sb.from("misas").delete().eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    await persistLocal(
      "misas",
      getMisas().filter((m) => m.id !== id)
    );
  }
  cacheMisas = getMisas().filter((m) => m.id !== id);
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

// ---- Fallback local (public/data) ----

async function persistLocal(
  resource: "canciones" | "categorias" | "misas",
  data: unknown
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key =
    typeof window !== "undefined"
      ? sessionStorage.getItem(KEY_ADMIN_SECRET) || ""
      : "";
  if (key) headers["x-admin-key"] = key;
  const res = await fetch(`/api/data/${resource}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Error al guardar local");
  }
}

// ---- Admin ----

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

export function generarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function crearCancionVacia(
  categoria: string,
  titulo = "Nueva canción"
): Cancion {
  return {
    id: generarId(),
    titulo,
    categoria,
    lineas: [{ palabras: [{ texto: "" }] }],
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  };
}

export function textoALineas(
  texto: string
): { palabras: { texto: string }[] }[] {
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
    return lineaAcordes.trim()
      ? `${lineaAcordes}\n${lineaLetras}`
      : lineaLetras;
  });
  return `${cancion.titulo}\n${cancion.categoria.toUpperCase()}\n\n${lineasTexto.join("\n\n")}`;
}

/**
 * Migra JSON local (o datos viejos de app_data) a tablas normalizadas.
 */
export async function migrarJsonASupabase(): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase no configurado");

  let canciones = await fetchJsonFile<Cancion[]>("/data/canciones.json", []);
  let categorias = await fetchJsonFile<Categoria[]>(
    "/data/categorias.json",
    CATEGORIAS_DEFAULT
  );
  let misas = await fetchJsonFile<Misa[]>("/data/misas.json", []);

  // Si hay datos en app_data viejo, úsalos
  const legacy = await sb.from("app_data").select("key, data");
  if (!legacy.error && legacy.data?.length) {
    const map = Object.fromEntries(legacy.data.map((r) => [r.key, r.data]));
    if (Array.isArray(map.canciones) && map.canciones.length) {
      canciones = map.canciones as Cancion[];
    }
    if (Array.isArray(map.categorias) && map.categorias.length) {
      categorias = map.categorias as Categoria[];
    }
    if (Array.isArray(map.misas) && map.misas.length) {
      misas = map.misas as Misa[];
    }
  }

  if (!categorias.length) categorias = CATEGORIAS_DEFAULT;

  const catRows = categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    orden: c.orden,
    icono: c.icono || "🎵",
  }));
  const { error: e1 } = await sb.from("categorias").upsert(catRows, { onConflict: "id" });
  if (e1) throw new Error(`categorias: ${e1.message}. ¿Ejecutaste schema-v2.sql?`);

  const canRows = canciones.map(cancionToRow);
  const { error: e2 } = await sb.from("canciones").upsert(canRows, { onConflict: "id" });
  if (e2) throw new Error(`canciones: ${e2.message}`);

  if (misas.length) {
    const misRows = misas.map(misaToRow);
    const { error: e3 } = await sb.from("misas").upsert(misRows, { onConflict: "id" });
    if (e3) throw new Error(`misas: ${e3.message}`);
  }

  cacheCanciones = canciones;
  cacheCategorias = categorias;
  cacheMisas = misas;

  return `Migrado a tablas: ${canciones.length} canciones, ${categorias.length} categorías, ${misas.length} misas.`;
}
