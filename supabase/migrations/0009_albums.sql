-- 0009_albums.sql
-- Albums: grouping tracks by release/project

CREATE TABLE IF NOT EXISTS public.albums (
  id           text PRIMARY KEY,
  title        text NOT NULL,
  artist       text,
  description  text,
  cover_image  text,
  cover        text NOT NULL DEFAULT 'violet',
  glyph        text NOT NULL DEFAULT '🎵',
  genre_slug   text REFERENCES public.genres(slug) ON DELETE SET NULL,
  mood         text,
  uploader_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published    boolean NOT NULL DEFAULT true,
  release_date date DEFAULT CURRENT_DATE,
  sort_order   bigint DEFAULT extract(epoch from now()),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS albums_uploader_id_idx ON public.albums (uploader_id);

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read albums"
  ON public.albums FOR SELECT
  USING (published = true);

CREATE POLICY "Admin full albums"
  ON public.albums FOR ALL TO authenticated
  USING  ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Producers manage own albums"
  ON public.albums FOR ALL TO authenticated
  USING  (uploader_id = auth.uid() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','producer'))
  WITH CHECK (uploader_id = auth.uid() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','producer'));

-- Link tracks to albums
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS album_id text REFERENCES public.albums(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tracks_album_id_idx ON public.tracks (album_id);
