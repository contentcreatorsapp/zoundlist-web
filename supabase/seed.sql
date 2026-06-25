-- ============================================================
-- ZOUNDLIST — Seed del catálogo (Fase 2)
-- Ejecutar DESPUÉS de 0001_catalog.sql. Idempotente (on conflict).
-- ============================================================

insert into public.genres (slug, name, glyph, cover, track_count, sort_order) values
  ('cinematic', 'Cinematic', '🎬', 'violet',  42, 1),
  ('lofi',      'Lo-fi',     '🌧️', 'orange',  31, 2),
  ('worship',   'Worship',   '✨', 'ice',     28, 3),
  ('corporate', 'Corporate', '💼', 'teal',    24, 4),
  ('social',    'Social',    '📱', 'magenta', 36, 5),
  ('podcast',   'Podcast',   '🎙️', 'gold',    19, 6)
on conflict (slug) do nothing;

insert into public.moods (slug, name, cover, track_count, sort_order) values
  ('epico',        'Épico',        'ember',   26, 1),
  ('tranquilo',    'Tranquilo',    'teal',    33, 2),
  ('motivacional', 'Motivacional', 'lime',    22, 3),
  ('melancolico',  'Melancólico',  'ice',     18, 4),
  ('energetico',   'Energético',   'magenta', 29, 5),
  ('reverente',    'Reverente',    'violet',  15, 6)
on conflict (slug) do nothing;

insert into public.tracks
  (slug, title, artist, genre_slug, mood, cover, glyph, bpm, duration, featured, trending, staff_pick, staff_hero, is_new, staff_note, sort_order)
values
  ('midnight-drive',  'Midnight Drive',  'Cinematic', 'cinematic', 'Épico',        'violet',  '🎬', 118, '2:43', true,  true,  false, false, false, null, 1),
  ('golden-hour',     'Golden Hour',     'Cinematic', 'cinematic', 'Nostálgico',   'gold',    '🌅', 96,  '3:20', true,  true,  true,  true,  false,
    'Texturas cálidas y un crescendo que respira. Funciona igual de bien en un reel de bodas que en el cierre de un documental.', 2),
  ('heavens-gate',    'Heaven''s Gate',  'Worship',   'worship',   'Reverente',    'ice',     '✨', 72,  '4:02', true,  true,  true,  false, false, null, 3),
  ('morning-light',   'Morning Light',   'Lo-fi',     'lofi',      'Tranquilo',    'orange',  '☕', 84,  '3:15', false, true,  false, false, false, null, 4),
  ('corporate-pulse', 'Corporate Pulse', 'Corporate', 'corporate', 'Motivacional', 'teal',    '💼', 120, '2:28', false, true,  true,  false, false, null, 5),
  ('reel-hook',       'Reel Hook',       'Social',    'social',    'Energético',   'magenta', '📱', 128, '0:30', true,  true,  false, false, false, null, 6),
  ('deep-focus',      'Deep Focus',      'Podcast',   'podcast',   'Concentrado',  'violet',  '🎙️', 90,  '3:40', false, false, true,  false, false, null, 7),
  ('lofi-rain',       'Lo-fi Rain',      'Lo-fi',     'lofi',      'Melancólico',  'ice',     '🌧️', 78,  '2:55', false, false, false, false, true,  null, 8),
  ('brand-launch',    'Brand Launch',    'Corporate', 'corporate', 'Ambicioso',    'ember',   '🚀', 126, '2:10', true,  true,  false, false, false, null, 9),
  ('neon-skyline',    'Neon Skyline',    'Cinematic', 'cinematic', 'Épico',        'magenta', '🌃', 110, '3:05', true,  true,  false, false, true,  null, 10),
  ('quiet-sanctuary', 'Quiet Sanctuary', 'Worship',   'worship',   'Reverente',    'violet',  '🕊️', 68,  '4:30', false, false, false, false, true,  null, 11),
  ('late-study',      'Late Study',      'Lo-fi',     'lofi',      'Tranquilo',    'teal',    '📚', 80,  '3:12', false, false, true,  false, true,  null, 12)
on conflict (slug) do nothing;
