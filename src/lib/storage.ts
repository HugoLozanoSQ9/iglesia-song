import { Cancion, Categoria, CATEGORIAS_DEFAULT } from "@/types/song";

const KEY_CANCIONES = "iglesia-canciones";
const KEY_CATEGORIAS = "iglesia-categorias";
const KEY_ADMIN = "iglesia-admin-auth";

// ---- Canciones ----

export function getCanciones(): Cancion[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(KEY_CANCIONES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getCancionesPorCategoria(categoriaId: string): Cancion[] {
  return getCanciones()
    .filter((c) => c.categoria === categoriaId)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
}

export function getCancion(id: string): Cancion | null {
  return getCanciones().find((c) => c.id === id) || null;
}

export function guardarCancion(cancion: Cancion): void {
  const todas = getCanciones();
  const idx = todas.findIndex((c) => c.id === cancion.id);
  if (idx >= 0) {
    todas[idx] = { ...cancion, actualizadoEn: new Date().toISOString() };
  } else {
    todas.push(cancion);
  }
  localStorage.setItem(KEY_CANCIONES, JSON.stringify(todas));
}

export function eliminarCancion(id: string): void {
  const filtradas = getCanciones().filter((c) => c.id !== id);
  localStorage.setItem(KEY_CANCIONES, JSON.stringify(filtradas));
}

// ---- Categorías ----

export function getCategorias(): Categoria[] {
  if (typeof window === "undefined") return CATEGORIAS_DEFAULT;
  try {
    const data = localStorage.getItem(KEY_CATEGORIAS);
    if (data) {
      const custom = JSON.parse(data) as Categoria[];
      // Merge: keep defaults + custom
      const ids = new Set(custom.map((c) => c.id));
      const defaultsFaltantes = CATEGORIAS_DEFAULT.filter((c) => !ids.has(c.id));
      return [...defaultsFaltantes, ...custom].sort((a, b) => a.orden - b.orden);
    }
    return CATEGORIAS_DEFAULT;
  } catch {
    return CATEGORIAS_DEFAULT;
  }
}

export function guardarCategorias(categorias: Categoria[]): void {
  localStorage.setItem(KEY_CATEGORIAS, JSON.stringify(categorias));
}

export function agregarCategoria(nombre: string): Categoria {
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
  guardarCategorias(actualizadas);
  return nueva;
}

// ---- Auth simple (MVP) ----

export function isAdminAutenticado(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY_ADMIN) === "true";
}

export function loginAdmin(usuario: string, password: string): boolean {
  // Credenciales simples para MVP. Cambiar después.
  if (usuario === "admin" && password === "iglesia2026") {
    localStorage.setItem(KEY_ADMIN, "true");
    return true;
  }
  return false;
}

export function logoutAdmin(): void {
  localStorage.removeItem(KEY_ADMIN);
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
    lineas: [
      {
        palabras: [{ texto: "Escribe" }, { texto: "aquí" }, { texto: "la" }, { texto: "letra..." }],
      },
    ],
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  };
}

/** Convierte texto plano a estructura de líneas (sin acordes) */
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

/** Exporta canción a formato texto legible (acordes arriba) */
export function cancionATexto(cancion: Cancion): string {
  const lineasTexto = cancion.lineas.map((linea) => {
    const acordes: string[] = [];
    const letras: string[] = [];

    linea.palabras.forEach((p) => {
      const ancho = Math.max(p.texto.length, (p.acorde || "").length);
      acordes.push((p.acorde || "").padEnd(ancho));
      letras.push(p.texto.padEnd(ancho));
    });

    const lineaAcordes = acordes.join(" ").trimEnd();
    const lineaLetras = letras.join(" ").trimEnd();
    return lineaAcordes ? `${lineaAcordes}\n${lineaLetras}` : lineaLetras;
  });

  return `${cancion.titulo}\n${cancion.categoria.toUpperCase()}\n\n${lineasTexto.join("\n\n")}`;
}
