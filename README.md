# Cancionero Parroquial

Aplicación web para gestionar el cancionero del coro de la iglesia.

## Características

- **Zona pública**: ver canciones por categoría (Entrada, Gloria, Salmo, etc.)
- **Zona privada (Admin)**: crear, editar y eliminar canciones
- **Editor visual de acordes**: los acordes se ligan a cada palabra (no se desalinean)
- **Descarga** de canciones en texto plano
- **Categorías extendibles**
- Diseño amigable para todas las edades (tipografía grande, alto contraste, botones grandes)

## Credenciales de Admin (MVP)

- Usuario: `admin`
- Contraseña: `iglesia2026`

> Cambia estas credenciales en `src/lib/storage.ts` antes de producción.

## Cómo correr

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Almacenamiento local (localStorage) — fácil de migrar a Supabase después

## Estructura principal

- `/` — Categorías
- `/categoria/[id]` — Lista de canciones
- `/cancion/[id]` — Ver canción + descargar
- `/admin` — Panel de administración
- `/admin/nueva` — Crear canción
- `/admin/editar/[id]` — Editar canción

## Próximos pasos posibles

- Migrar a Supabase (auth real + base de datos compartida)
- Exportar a PDF bonito
- Transposición de tonalidad
- Modo presentación para proyector
- Importar desde ChordPro / Cifra Club
