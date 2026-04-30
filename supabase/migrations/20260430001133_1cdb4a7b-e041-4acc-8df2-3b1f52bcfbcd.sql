
-- Remove permissive write policies; all writes go through server functions
DROP POLICY IF EXISTS "Public read presells" ON public.presells;
DROP POLICY IF EXISTS "Public insert presells" ON public.presells;
DROP POLICY IF EXISTS "Public update presells" ON public.presells;
DROP POLICY IF EXISTS "Public delete presells" ON public.presells;

DROP POLICY IF EXISTS "Public read presell images" ON storage.objects;
DROP POLICY IF EXISTS "Public upload presell images" ON storage.objects;
DROP POLICY IF EXISTS "Public update presell images" ON storage.objects;
DROP POLICY IF EXISTS "Public delete presell images" ON storage.objects;

-- Allow public READ of cover images (bucket is public anyway via direct URL)
-- but restrict listing by requiring an exact name lookup is not enforceable in storage policies,
-- so we keep read access only via direct URL (bucket public=true handles it).
-- We add a SELECT policy for getPublicUrl to work without listing being abused.
CREATE POLICY "Read presell images" ON storage.objects
  FOR SELECT USING (bucket_id = 'presell-images');

-- Fix function search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
