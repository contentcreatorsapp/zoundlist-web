-- ============================================================
-- ZOUNDLIST — Fase 5: descargas + certificados de licencia
-- Ejecutar en Supabase → SQL Editor (después de 0001/0002/0003).
-- ============================================================

-- Secuencia para numerar certificados de forma legible (ZND-AÑO-00001).
create sequence if not exists public.zl_cert_seq start 1;

create table if not exists public.downloads (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  track_id           uuid,
  track_title        text not null,
  plan               text,
  certificate_number text not null unique
    default ('ZND-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.zl_cert_seq')::text, 5, '0')),
  created_at         timestamptz not null default now()
);

alter table public.downloads enable row level security;

-- El usuario solo ve sus propias descargas. Las inserciones las hace el
-- servidor con la service-role key (la descarga se valida en el backend).
drop policy if exists "downloads_select_own" on public.downloads;
create policy "downloads_select_own" on public.downloads
  for select using (auth.uid() = user_id);

create index if not exists downloads_user_idx on public.downloads (user_id, created_at desc);
