-- 1) Tabela de múltiplos sites WordPress
CREATE TABLE public.wp_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  site_url TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  app_password TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wp_sites ENABLE ROW LEVEL SECURITY;

-- App ainda não tem auth: leitura/escrita protegida apenas via service role no servidor.
-- Não criamos policies públicas — o cliente nunca acessa essa tabela diretamente.

CREATE TRIGGER wp_sites_touch_updated_at
BEFORE UPDATE ON public.wp_sites
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Garantir no máximo 1 site padrão
CREATE UNIQUE INDEX wp_sites_only_one_default
ON public.wp_sites ((is_default)) WHERE is_default = true;

-- 2) Migrar config existente (se houver) como primeiro site
INSERT INTO public.wp_sites (name, site_url, username, app_password, is_default)
SELECT
  CASE WHEN COALESCE(site_url,'') = '' THEN 'Meu site WordPress'
       ELSE regexp_replace(site_url, '^https?://(www\.)?', '') END,
  COALESCE(site_url, ''),
  COALESCE(username, ''),
  COALESCE(app_password, ''),
  true
FROM public.wp_settings
WHERE id = 1
  AND COALESCE(site_url,'') <> '';

-- 3) Coluna wp_site_id em presells
ALTER TABLE public.presells
ADD COLUMN wp_site_id UUID REFERENCES public.wp_sites(id) ON DELETE SET NULL;

CREATE INDEX idx_presells_wp_site_id ON public.presells(wp_site_id);
