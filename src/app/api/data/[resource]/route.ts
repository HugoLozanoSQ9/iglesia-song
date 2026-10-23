import { NextRequest, NextResponse } from "next/server";
import {
  DataResource,
  readCanciones,
  readCategorias,
  readMisas,
  writeDataFile,
} from "@/lib/file-store";
import { CATEGORIAS_DEFAULT } from "@/types/song";

const VALID: DataResource[] = ["canciones", "categorias", "misas"];

function isResource(s: string): s is DataResource {
  return VALID.includes(s as DataResource);
}

/** Lectura pública de los JSON */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ resource: string }> }
) {
  const { resource } = await ctx.params;
  if (!isResource(resource)) {
    return NextResponse.json({ error: "Recurso no válido" }, { status: 400 });
  }

  if (resource === "canciones") {
    return NextResponse.json(await readCanciones());
  }
  if (resource === "categorias") {
    const cats = await readCategorias();
    return NextResponse.json(cats.length ? cats : CATEGORIAS_DEFAULT);
  }
  return NextResponse.json(await readMisas());
}

/**
 * Escritura: actualiza public/data/*.json en disco.
 * Tú haces git add / commit / push y al desplegar se ven los cambios.
 */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string }> }
) {
  const { resource } = await ctx.params;
  if (!isResource(resource)) {
    return NextResponse.json({ error: "Recurso no válido" }, { status: 400 });
  }

  // Clave simple de admin (opcional). Si no hay ADMIN_PASSWORD en .env, permite guardar en local.
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword) {
    const key = req.headers.get("x-admin-key") || "";
    if (key !== adminPassword) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Se espera un arreglo JSON" }, { status: 400 });
    }
    await writeDataFile(resource, body);
    return NextResponse.json({ ok: true, resource, count: body.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al guardar";
    return NextResponse.json(
      {
        error: msg,
        hint: "La escritura a archivos solo funciona en local (npm run dev). Luego haz commit y push de public/data/",
      },
      { status: 500 }
    );
  }
}
