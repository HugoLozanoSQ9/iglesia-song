/** Transposición de acordes por semitonos */

const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

/** Tonalidades mayores comunes para el selector */
export const TONALIDADES = [
  "C", "C#", "Db", "D", "Eb", "E", "F", "F#", "Gb", "G", "Ab", "A", "Bb", "B",
] as const;

const ENHARMONIC: Record<string, number> = {
  C: 0, "C#": 1, Db: 1,
  D: 2, "D#": 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, "E#": 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8,
  A: 9, "A#": 10, Bb: 10,
  B: 11, Cb: 11, H: 11,
};

export function notaAIndice(nota: string): number | null {
  const n = nota.replace("♯", "#").replace("♭", "b").trim();
  if (n in ENHARMONIC) return ENHARMONIC[n];
  return null;
}

export function indiceANota(i: number, usarBemoles = false): string {
  const idx = ((i % 12) + 12) % 12;
  return usarBemoles ? FLAT[idx] : SHARP[idx];
}

/** Semitonos entre dos tonalidades (ej. C → D = 2) */
export function semitonosEntre(desde: string, hasta: string): number {
  const a = notaAIndice(desde);
  const b = notaAIndice(hasta);
  if (a === null || b === null) return 0;
  return ((b - a) % 12 + 12) % 12;
}

/**
 * Transpone un acorde: "Am", "F#m7", "Bb/D", "Gsus4", "Am-A7"
 */
export function transponerAcorde(
  acorde: string,
  semitonos: number,
  usarBemoles = false
): string {
  if (!acorde || !semitonos) return acorde;
  const s = acorde.trim();
  if (!s) return s;

  // Compuestos con guión: Am-A7, G-D, Em-E7
  if (s.includes("-")) {
    const parts = s.split("-");
    const parecenAcordes = parts.every((p) => /^[A-GH]/i.test(p.trim()));
    if (parts.length >= 2 && parecenAcordes) {
      return parts
        .map((part) => transponerAcorde(part.trim(), semitonos, usarBemoles))
        .join("-");
    }
  }

  // Bajo slash: G/B
  if (s.includes("/")) {
    const [main, bass] = s.split("/");
    return (
      transponerAcorde(main, semitonos, usarBemoles) +
      "/" +
      transponerRaiz(bass.trim(), semitonos, usarBemoles)
    );
  }

  const m = s.match(/^([A-GH])([#b♯♭]?)(.*)$/i);
  if (!m) return s;
  const root = m[1].toUpperCase() + (m[2] || "").replace("♯", "#").replace("♭", "b");
  const suffix = m[3] || "";
  return transponerRaiz(root, semitonos, usarBemoles) + suffix;
}

function transponerRaiz(root: string, semitonos: number, usarBemoles: boolean): string {
  const idx = notaAIndice(root);
  if (idx === null) return root;
  return indiceANota(idx + semitonos, usarBemoles);
}

export function debeUsarBemoles(tonalidad?: string): boolean {
  if (!tonalidad) return false;
  return /b|♭|Db|Eb|Gb|Ab|Bb|F$/.test(tonalidad);
}

import type { Cancion, Linea, Palabra } from "@/types/song";
import { getAcordesDePalabra } from "@/types/song";

/** Transpone todos los acordes de una canción (devuelve copia). */
export function transponerCancion(
  cancion: Cancion,
  semitonos: number,
  opts?: { actualizarTonalidad?: boolean; usarBemoles?: boolean }
): Cancion {
  if (!semitonos) return cancion;
  const flats =
    opts?.usarBemoles ??
    debeUsarBemoles(cancion.tonalidad);

  const lineas: Linea[] = cancion.lineas.map((linea) => ({
    palabras: linea.palabras.map((p: Palabra) => {
      const lista = getAcordesDePalabra(p);
      if (!lista.length) {
        const { acorde, acordeIndex, acordes, ...rest } = p;
        return { ...rest, texto: p.texto };
      }
      const nuevos = lista.map((a) => ({
        acorde: transponerAcorde(a.acorde, semitonos, flats),
        index: a.index,
      }));
      const { acorde, acordeIndex, ...rest } = p;
      return { ...rest, texto: p.texto, acordes: nuevos };
    }),
  }));

  let tonalidad = cancion.tonalidad;
  if (opts?.actualizarTonalidad && tonalidad) {
    const idx = notaAIndice(tonalidad);
    if (idx !== null) {
      tonalidad = indiceANota(idx + semitonos, flats);
    }
  }

  return {
    ...cancion,
    lineas,
    tonalidad,
  };
}
