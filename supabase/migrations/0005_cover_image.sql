-- ============================================================
-- ZOUNDLIST — Portada con imagen real (opcional) por track
-- Ejecutar en Supabase → SQL Editor (después de 0001–0004).
-- ============================================================

-- URL pública de la imagen de portada (bucket 'covers'). Si es null,
-- la UI cae al gradiente mesh por defecto.
alter table public.tracks add column if not exists cover_image text;
