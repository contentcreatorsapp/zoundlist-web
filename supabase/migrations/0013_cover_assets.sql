-- Cover asset library: curated images per genre for album cover selection
CREATE TABLE IF NOT EXISTS cover_assets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  genre_slug   text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  public_url   text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cover_assets_genre ON cover_assets (genre_slug, sort_order);

-- Public read — producers browse covers without auth
ALTER TABLE cover_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "covers_public_read" ON cover_assets
  FOR SELECT USING (active = true);

CREATE POLICY "covers_admin_all" ON cover_assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
