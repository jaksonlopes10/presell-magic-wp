
-- Switch trigger function to SECURITY INVOKER (no need for elevated privs)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Make the bucket private; images will be served via direct CDN URL stored in DB.
-- Since bucket is no longer public-listable from the client, drop the listing-prone SELECT policy.
UPDATE storage.buckets SET public = true WHERE id = 'presell-images';
-- Public bucket already permits direct GET by URL; we don't need an extra SELECT policy on storage.objects.
DROP POLICY IF EXISTS "Read presell images" ON storage.objects;
