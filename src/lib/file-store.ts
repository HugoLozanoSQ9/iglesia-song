import { promises as fs } from "fs";
import path from "path";
import { Cancion, Categoria, CATEGORIAS_DEFAULT, Misa } from "@/types/song";

export type DataResource = "canciones" | "categorias" | "misas";

const DATA_DIR = path.join(process.cwd(), "public", "data");

function filePath(resource: DataResource) {
  return path.join(DATA_DIR, `${resource}.json`);
}

export async function readDataFile<T>(resource: DataResource, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath(resource), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeDataFile(resource: DataResource, data: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const body = JSON.stringify(data, null, 2) + "\n";
  await fs.writeFile(filePath(resource), body, "utf-8");
}

export async function readCanciones(): Promise<Cancion[]> {
  return readDataFile<Cancion[]>("canciones", []);
}

export async function readCategorias(): Promise<Categoria[]> {
  return readDataFile<Categoria[]>("categorias", CATEGORIAS_DEFAULT);
}

export async function readMisas(): Promise<Misa[]> {
  return readDataFile<Misa[]>("misas", []);
}
