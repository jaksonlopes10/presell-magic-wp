
-- WordPress settings (singleton: only one row, id = 1)
CREATE TABLE public.wp_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  site_url TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  app_password TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO public.wp_settings (id) VALUES (1);

-- Presells
CREATE TABLE public.presells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Nova presell',
  slug TEXT,
  template TEXT NOT NULL DEFAULT 'review',
  briefing JSONB NOT NULL DEFAULT '{}'::jsonb,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  cover_image_url TEXT,
  cta_url TEXT,
  cta_color TEXT DEFAULT '#16a34a',
  status TEXT NOT NULL DEFAULT 'draft',
  wp_post_id BIGINT,
  wp_post_url TEXT,
  wp_post_type TEXT DEFAULT 'page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX presells_updated_at_idx ON public.presells (updated_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER presells_touch BEFORE UPDATE ON public.presells
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER wp_settings_touch BEFORE UPDATE ON public.wp_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable RLS with permissive policies (single-user personal app)
ALTER TABLE public.wp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presells ENABLE ROW LEVEL SECURITY;

-- Anyone can read/write presells (personal app, no login)
CREATE POLICY "Public read presells" ON public.presells FOR SELECT USING (true);
CREATE POLICY "Public insert presells" ON public.presells FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update presells" ON public.presells FOR UPDATE USING (true);
CREATE POLICY "Public delete presells" ON public.presells FOR DELETE USING (true);

-- wp_settings: only readable/writable from server (no public access).
-- We do NOT add SELECT/INSERT/UPDATE policies, so anon key cannot read it.
-- All access goes through server functions using the service role.

-- Storage bucket for cover images
INSERT INTO storage.buckets (id, name, public) VALUES ('presell-images', 'presell-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read presell images" ON storage.objects
  FOR SELECT USING (bucket_id = 'presell-images');
CREATE POLICY "Public upload presell images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'presell-images');
CREATE POLICY "Public update presell images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'presell-images');
CREATE POLICY "Public delete presell images" ON storage.objects
  FOR DELETE USING (bucket_id = 'presell-images');
