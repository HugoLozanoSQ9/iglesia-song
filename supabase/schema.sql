-- Cancionero: esquema simple (JSON por recurso)
-- Ejecutar en: Supabase → SQL Editor → New query → Run

create table if not exists app_data (
  key text primary key,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_data enable row level security;

-- Lectura pública (cualquiera puede ver canciones)
drop policy if exists "public read app_data" on app_data;
create policy "public read app_data"
  on app_data for select
  using (true);

-- Escritura abierta SOLO PARA PRUEBAS (luego lo restringes)
drop policy if exists "public write app_data" on app_data;
create policy "public write app_data"
  on app_data for insert
  with check (true);

drop policy if exists "public update app_data" on app_data;
create policy "public update app_data"
  on app_data for update
  using (true)
  with check (true);

drop policy if exists "public delete app_data" on app_data;
create policy "public delete app_data"
  on app_data for delete
  using (true);

-- Filas iniciales vacías (opcional)
insert into app_data (key, data) values
  ('canciones', '[]'::jsonb),
  ('categorias', '[]'::jsonb),
  ('misas', '[]'::jsonb)
on conflict (key) do nothing;
