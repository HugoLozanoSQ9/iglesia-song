-- Cancionero v2: tablas normalizadas (una fila por canción)
-- Ejecutar en Supabase → SQL Editor

-- Limpia el esquema viejo de un solo JSON (opcional)
-- drop table if exists app_data;

create table if not exists categorias (
  id text primary key,
  nombre text not null,
  orden int not null default 0,
  icono text default '🎵'
);

create table if not exists canciones (
  id text primary key,
  titulo text not null,
  categoria text not null references categorias(id) on delete restrict,
  lineas jsonb not null default '[]'::jsonb,
  tonalidad text,
  autor text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_canciones_categoria on canciones(categoria);
create index if not exists idx_canciones_titulo on canciones(titulo);
create index if not exists idx_categorias_orden on categorias(orden);

create table if not exists misas (
  id text primary key,
  titulo text not null,
  fecha text,
  seleccion jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_misas_fecha on misas(fecha);

-- RLS
alter table categorias enable row level security;
alter table canciones enable row level security;
alter table misas enable row level security;

-- Lectura pública
drop policy if exists "cat_select" on categorias;
create policy "cat_select" on categorias for select using (true);
drop policy if exists "can_select" on canciones;
create policy "can_select" on canciones for select using (true);
drop policy if exists "mis_select" on misas;
create policy "mis_select" on misas for select using (true);

-- Escritura abierta SOLO PRUEBAS (luego restringir)
drop policy if exists "cat_write" on categorias;
create policy "cat_write" on categorias for all using (true) with check (true);
drop policy if exists "can_write" on canciones;
create policy "can_write" on canciones for all using (true) with check (true);
drop policy if exists "mis_write" on misas;
create policy "mis_write" on misas for all using (true) with check (true);
