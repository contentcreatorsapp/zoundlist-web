-- ============================================================
-- ZOUNDLIST — Fase 3: Storage (audio + portadas) + audio_path
-- Ejecutar en Supabase → SQL Editor (después de 0001).
-- ============================================================

-- Ruta del archivo de audio en cada track
alter table public.tracks add column if not exists audio_path text;

-- ── Buckets ─────────────────────────────────────────────────
-- Públicos para lectura (preview/reproducción); escritura solo admin (políticas abajo).
insert into storage.buckets (id, name, public) values ('tracks', 'tracks', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('covers', 'covers', true)
  on conflict (id) do nothing;

-- ── Políticas de storage.objects ────────────────────────────
drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id in ('tracks', 'covers'));

drop policy if exists "media_admin_insert" on storage.objects;
create policy "media_admin_insert" on storage.objects
  for insert with check (bucket_id in ('tracks', 'covers') and public.is_admin());

drop policy if exists "media_admin_update" on storage.objects;
create policy "media_admin_update" on storage.objects
  for update using (bucket_id in ('tracks', 'covers') and public.is_admin());

drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_admin_delete" on storage.objects
  for delete using (bucket_id in ('tracks', 'covers') and public.is_admin());
