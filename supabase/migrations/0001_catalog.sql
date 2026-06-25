-- ============================================================
-- ZOUNDLIST — Fase 2: esquema de catálogo + perfiles + RLS
-- Ejecutar en Supabase → SQL Editor (una vez).
-- ============================================================

create extension if not exists "pgcrypto";

-- ── PROFILES ────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text not null default 'user' check (role in ('user', 'admin')),
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Crea el perfil automáticamente al registrarse un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ¿El usuario actual es admin? (usado por las políticas de escritura)
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ── GENRES ──────────────────────────────────────────────────
create table if not exists public.genres (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  glyph       text,
  cover       text not null,
  track_count int  not null default 0,
  sort_order  int  not null default 0
);

alter table public.genres enable row level security;
drop policy if exists "genres_read_all" on public.genres;
create policy "genres_read_all" on public.genres for select using (true);
drop policy if exists "genres_admin_write" on public.genres;
create policy "genres_admin_write" on public.genres for all
  using (public.is_admin()) with check (public.is_admin());

-- ── MOODS ───────────────────────────────────────────────────
create table if not exists public.moods (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  cover       text not null,
  track_count int  not null default 0,
  sort_order  int  not null default 0
);

alter table public.moods enable row level security;
drop policy if exists "moods_read_all" on public.moods;
create policy "moods_read_all" on public.moods for select using (true);
drop policy if exists "moods_admin_write" on public.moods;
create policy "moods_admin_write" on public.moods for all
  using (public.is_admin()) with check (public.is_admin());

-- ── TRACKS ──────────────────────────────────────────────────
create table if not exists public.tracks (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  title      text not null,
  artist     text not null,
  genre_slug text not null,
  mood       text not null,
  cover      text not null,
  glyph      text,
  bpm        int,
  duration   text,
  featured   boolean not null default false,
  trending   boolean not null default false,
  staff_pick boolean not null default false,
  staff_hero boolean not null default false,
  is_new     boolean not null default false,
  staff_note text,
  published  boolean not null default true,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

alter table public.tracks enable row level security;
-- Catálogo público: todos leen lo publicado; admin lo ve todo.
drop policy if exists "tracks_read_published" on public.tracks;
create policy "tracks_read_published" on public.tracks
  for select using (published = true or public.is_admin());
-- Solo admin puede crear/editar/borrar (modelo curado).
drop policy if exists "tracks_admin_write" on public.tracks;
create policy "tracks_admin_write" on public.tracks for all
  using (public.is_admin()) with check (public.is_admin());

create index if not exists tracks_genre_idx on public.tracks (genre_slug);
create index if not exists tracks_sort_idx  on public.tracks (sort_order);
