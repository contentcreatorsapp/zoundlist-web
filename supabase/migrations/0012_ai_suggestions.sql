-- 0012_ai_suggestions.sql
-- AI Publishing Assistant: suggestion layer on top of tracks

-- Track AI workflow status
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS ai_status text NOT NULL DEFAULT 'draft';
  -- draft | ai_generated | reviewed | published

-- ── AI suggestion store ───────────────────────────────────────────────────────
-- One row per track (upserted each time the producer runs the assistant).
-- Never overwrites the track row — producer decides when to apply.

CREATE TABLE IF NOT EXISTS public.ai_track_suggestions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id         uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  album_id         text REFERENCES public.albums(id) ON DELETE SET NULL,

  -- Generation metadata
  status           text NOT NULL DEFAULT 'completed',
  -- pending | processing | completed | failed | cancelled
  provider         text,
  model            text,
  processing_ms    integer,
  cost_units       integer,   -- tokens consumed
  error            text,

  -- Generated metadata
  title            text,
  description      text,
  genre            text,
  subgenre         text,
  moods            text[]     DEFAULT '{}',
  energy           smallint   CHECK (energy BETWEEN 1 AND 10),
  bpm              integer,
  musical_key      text,
  instruments      text[]     DEFAULT '{}',
  tags             text[]     DEFAULT '{}',
  recommended_uses text[]     DEFAULT '{}',
  confidence       numeric(3,2),

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ai_suggestions_track_unique UNIQUE (track_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_track  ON public.ai_track_suggestions (track_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_album  ON public.ai_track_suggestions (album_id);
CREATE INDEX IF NOT EXISTS idx_tracks_ai_status      ON public.tracks (ai_status);

ALTER TABLE public.ai_track_suggestions ENABLE ROW LEVEL SECURITY;

-- Producers read their own suggestions
CREATE POLICY "Producers read own ai suggestions"
  ON public.ai_track_suggestions FOR SELECT TO authenticated
  USING (
    track_id IN (
      SELECT id FROM public.tracks WHERE uploader_id = auth.uid()
    )
  );

-- Admins see all
CREATE POLICY "Admin full ai suggestions"
  ON public.ai_track_suggestions FOR ALL TO authenticated
  USING  ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Writes go through service_role (API route uses admin client)
