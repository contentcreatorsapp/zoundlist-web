-- 0008_uploader_id.sql
-- Track authorship: link each track to the producer who uploaded it

ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS uploader_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tracks_uploader_id_idx ON public.tracks (uploader_id);

-- Allow producers to insert their own tracks
DROP POLICY IF EXISTS "Producers insert own tracks" ON public.tracks;
CREATE POLICY "Producers insert own tracks"
  ON public.tracks FOR INSERT TO authenticated
  WITH CHECK (
    uploader_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'producer')
  );

-- Allow producers to update/delete their own tracks
DROP POLICY IF EXISTS "Producers manage own tracks" ON public.tracks;
CREATE POLICY "Producers manage own tracks"
  ON public.tracks FOR UPDATE TO authenticated
  USING (uploader_id = auth.uid())
  WITH CHECK (uploader_id = auth.uid());

DROP POLICY IF EXISTS "Producers delete own tracks" ON public.tracks;
CREATE POLICY "Producers delete own tracks"
  ON public.tracks FOR DELETE TO authenticated
  USING (uploader_id = auth.uid());
