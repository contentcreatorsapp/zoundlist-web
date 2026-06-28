-- 0011_zip_upload_rls.sql
-- Two security fixes required for ZIP upload by producers.

-- ── Fix 1: Storage — allow producers to upload to tracks + covers ─────────────
-- Migration 0002 set media_admin_insert to admin-only.
-- Producers uploading ZIPs need INSERT on both buckets.

DROP POLICY IF EXISTS "media_admin_insert"  ON storage.objects;
DROP POLICY IF EXISTS "media_uploader_insert" ON storage.objects;

CREATE POLICY "media_uploader_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('tracks', 'covers')
    AND auth.uid() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'producer')
  );

-- Keep update/delete as admin-only (producers don't need to overwrite files)
-- media_admin_update and media_admin_delete from 0002 remain unchanged.

-- ── Fix 2: Tracks INSERT — verify album belongs to the uploader ───────────────
-- Without this, a producer could insert tracks into another producer's album
-- by crafting a request with a foreign album_id.

DROP POLICY IF EXISTS "Producers insert own tracks" ON public.tracks;

CREATE POLICY "Producers insert own tracks"
  ON public.tracks FOR INSERT TO authenticated
  WITH CHECK (
    uploader_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'producer')
    AND (
      album_id IS NULL
      OR album_id IN (
        SELECT id FROM public.albums WHERE uploader_id = auth.uid()
      )
    )
  );
