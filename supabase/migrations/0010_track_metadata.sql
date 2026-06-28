-- 0010_track_metadata.sql
-- Expand tracks with professional metadata for a 100k+ catalog

ALTER TABLE public.tracks
  -- Technical audio info (populated during upload/analysis)
  ADD COLUMN IF NOT EXISTS storage_path      text,
  ADD COLUMN IF NOT EXISTS file_size         bigint,
  ADD COLUMN IF NOT EXISTS file_format       text,
  ADD COLUMN IF NOT EXISTS bitrate           integer,
  ADD COLUMN IF NOT EXISTS sample_rate       integer,
  ADD COLUMN IF NOT EXISTS channels          integer,
  ADD COLUMN IF NOT EXISTS duration_secs     numeric,

  -- Extended music metadata
  ADD COLUMN IF NOT EXISTS subgenre          text,
  ADD COLUMN IF NOT EXISTS musical_key       text,
  ADD COLUMN IF NOT EXISTS energy            smallint CHECK (energy BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS instruments       text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags              text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recommended_uses  text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description       text,

  -- Waveform + preview (populated in Phase 2)
  ADD COLUMN IF NOT EXISTS waveform_peaks    jsonb,
  ADD COLUMN IF NOT EXISTS preview_path      text,

  -- Processing pipeline status
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'ready';
  -- pending | analyzing | ready | error

-- ── Indexes for catalog filtering at scale ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tracks_genre_pub
  ON public.tracks (genre_slug, published);

CREATE INDEX IF NOT EXISTS idx_tracks_mood_pub
  ON public.tracks (mood, published);

CREATE INDEX IF NOT EXISTS idx_tracks_bpm
  ON public.tracks (bpm)
  WHERE published = true;

CREATE INDEX IF NOT EXISTS idx_tracks_key
  ON public.tracks (musical_key)
  WHERE published = true;

CREATE INDEX IF NOT EXISTS idx_tracks_energy
  ON public.tracks (energy)
  WHERE published = true;

-- GIN indexes for array search (e.g. tags @> ARRAY['cinematic'])
CREATE INDEX IF NOT EXISTS idx_tracks_tags
  ON public.tracks USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_tracks_instruments
  ON public.tracks USING GIN (instruments);

CREATE INDEX IF NOT EXISTS idx_tracks_uses
  ON public.tracks USING GIN (recommended_uses);

-- Full-text search index on title + artist + description
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(artist, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(description, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_tracks_fts
  ON public.tracks USING GIN (search_vector);

-- ── Background job queue ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id    uuid REFERENCES public.tracks(id) ON DELETE CASCADE,
  job_type    text NOT NULL,     -- 'analyze' | 'waveform' | 'preview' | 'id3'
  status      text NOT NULL DEFAULT 'pending',  -- pending | processing | done | error
  payload     jsonb,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.processing_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_track  ON public.processing_jobs (track_id);

ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- Admins see every job
CREATE POLICY "Admin see all jobs"
  ON public.processing_jobs FOR SELECT TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Producers see only jobs tied to their own tracks
CREATE POLICY "Producers see own jobs"
  ON public.processing_jobs FOR SELECT TO authenticated
  USING (
    track_id IN (
      SELECT id FROM public.tracks WHERE uploader_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE must go through service_role (API routes) — no browser policies needed yet
