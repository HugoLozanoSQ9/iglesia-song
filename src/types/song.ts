/** Un acorde anclado a una letra concreta de la palabra */
export interface AcordePos {
  acorde: string;
  /** Índice de la letra (0-based) donde empieza el acorde */
  index: number;
}

export interface Palabra {
  texto: string;
  /**
   * Varios acordes en la misma palabra (cambios rápidos).
   * Preferido sobre acorde/acordeIndex.
   */
  acordes?: AcordePos[];
  /** @deprecated un solo acorde (compatibilidad con canciones viejas) */
  acorde?: string;
  /** @deprecated índice del acorde único */
  acordeIndex?: number;
}

/** Normaliza acordes de una palabra (soporta formato viejo y nuevo) */
export function getAcordesDePalabra(p: Palabra): AcordePos[] {
  if (p.acordes && p.acordes.length > 0) {
    return p.acordes
      .filter((a) => a.acorde && a.acorde.trim())
      .map((a) => ({
        acorde: a.acorde.trim(),
        index: Math.max(0, a.index ?? 0),
      }))
      .sort((a, b) => a.index - b.index);
  }
  if (p.acorde && p.acorde.trim()) {
    return [{ acorde: p.acorde.trim(), index: Math.max(0, p.acordeIndex ?? 0) }];
  }
  return [];
}

export interface Linea {
  palabras: Palabra[];
}

export interface Cancion {
  id: string;
  titulo: string;
  categoria: string;
  lineas: Linea[];
  tonalidad?: string;
  autor?: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  orden: number;
  icono?: string;
}

/** Una misa = 1 canción por categoría (el "librito") */
export interface Misa {
  id: string;
  titulo: string;
  fecha?: string; // YYYY-MM-DD
  /** categoriaId → cancionId */
  seleccion: Record<string, string>;
  creadoEn: string;
  actualizadoEn: string;
}

export const CATEGORIAS_DEFAULT: Categoria[] = [
  { id: "entrada", nombre: "Entrada", orden: 1, icono: "🚪" },
  { id: "senor-ten-piedad", nombre: "Señor ten piedad", orden: 2, icono: "🙏" },
  { id: "gloria", nombre: "Gloria", orden: 3, icono: "✨" },
  { id: "salmo", nombre: "Salmo", orden: 4, icono: "📖" },
  { id: "aleluya", nombre: "Aleluya", orden: 5, icono: "🙌" },
  { id: "ofertorio", nombre: "Ofertorio", orden: 6, icono: "🍞" },
  { id: "santo", nombre: "Santo", orden: 7, icono: "⛪" },
  { id: "cordero-de-dios", nombre: "Cordero de Dios", orden: 8, icono: "🐑" },
  { id: "comunion", nombre: "Comunión", orden: 9, icono: "🍷" },
  { id: "salida", nombre: "Salida", orden: 10, icono: "🚶" },
];

export const ACORDES_COMUNES = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
  "Cm", "C#m", "Dm", "D#m", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bbm", "Bm",
  "C7", "D7", "E7", "F7", "G7", "A7", "B7",
  "Cmaj7", "Dmaj7", "Emaj7", "Fmaj7", "Gmaj7", "Amaj7",
  "Cm7", "Dm7", "Em7", "Fm7", "Gm7", "Am7",
  "Csus2", "Csus4", "Dsus2", "Dsus4", "Esus4", "Fsus2", "Gsus2", "Gsus4", "Asus2", "Asus4",
];
