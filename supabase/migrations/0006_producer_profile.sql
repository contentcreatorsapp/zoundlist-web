-- 0006_producer_profile.sql
-- Producer profile: avatar, banner, bio, social links, artist slug
-- Role 'producer' is valid (role column is text, no enum change needed)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS artist_name  text,
  ADD COLUMN IF NOT EXISTS bio          text,
  ADD COLUMN IF NOT EXISTS avatar_url   text,
  ADD COLUMN IF NOT EXISTS banner_url   text,
  ADD COLUMN IF NOT EXISTS instagram    text,
  ADD COLUMN IF NOT EXISTS spotify      text,
  ADD COLUMN IF NOT EXISTS website      text,
  ADD COLUMN IF NOT EXISTS artist_slug  text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_artist_slug_key
  ON public.profiles (artist_slug)
  WHERE artist_slug IS NOT NULL;

-- Allow authenticated users to update their own profile row
-- (sensitive fields like role/plan/stripe_* are only updated by service role via webhook)
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Avatars bucket ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read avatars"     ON storage.objects;
DROP POLICY IF EXISTS "Auth manage own avatar"  ON storage.objects;

CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Auth manage own avatar" ON storage.objects
  FOR ALL TO authenticated
  USING  (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);

-- ── Banners bucket ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('banners', 'banners', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read banners"    ON storage.objects;
DROP POLICY IF EXISTS "Auth manage own banner" ON storage.objects;

CREATE POLICY "Public read banners" ON storage.objects
  FOR SELECT USING (bucket_id = 'banners');

CREATE POLICY "Auth manage own banner" ON storage.objects
  FOR ALL TO authenticated
  USING  (bucket_id = 'banners' AND split_part(name, '/', 1) = auth.uid()::text)
  WITH CHECK (bucket_id = 'banners' AND split_part(name, '/', 1) = auth.uid()::text);
