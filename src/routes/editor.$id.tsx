import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Save, Sparkles, Upload, ExternalLink, Send, Monitor, Smartphone, ArrowLeft, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getPresell, savePresell, generateCopy, renderPreview, uploadCoverImage, publishToWp, listWpSitesFn,
} from "@/server/presells.functions";
import { TEMPLATES, type TemplateId } from "@/server/templates";

export const Route = createFileRoute("/editor/$id")({
  component: Editor,
  loader: async ({ params }) => {
    const [presell, sitesRes] = await Promise.all([
      getPresell({ data: { id: params.id } }),
      listWpSitesFn(),
    ]);
    return { presell, sites: sitesRes.sites };
  },
  head: () => ({ meta: [{ title: "Editor — Presell Builder" }] }),
});

type ContentT = {
  headline: string;
  subheadline: string;
  body: string;
  bullets: string[];
  social_proof: string;
  cta_label: string;
  trust_badges: string[];
};

type BriefingT = {
  product: string;
  niche: string;
  benefits: string;
  audience: string;
  tone: string;
};

function Editor() {
  const router = useRouter();
  const { presell: initial, sites } = Route.useLoaderData();
  const defaultSite = sites.find((s) => s.is_default) ?? sites[0] ?? null;

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [template, setTemplate] = useState<TemplateId>(initial.template as TemplateId);
  const [briefing, setBriefing] = useState<BriefingT>({
    product: "", niche: "", benefits: "", audience: "", tone: "",
    ...((initial.briefing as Partial<BriefingT>) ?? {}),
  });
  const [content, setContent] = useState<ContentT>({
    headline: "", subheadline: "", body: "", bullets: [], social_proof: "", cta_label: "Quero saber mais", trust_badges: [],
    ...((initial.content as Partial<ContentT>) ?? {}),
  });
  const [coverUrl, setCoverUrl] = useState<string | null>(initial.cover_image_url ?? null);
  const [ctaUrl, setCtaUrl] = useState(initial.cta_url ?? "");
  const [ctaColor, setCtaColor] = useState(initial.cta_color ?? "#16a34a");
  const [postType, setPostType] = useState<"page" | "post">((initial.wp_post_type as "page" | "post") ?? "page");
  const [siteId, setSiteId] = useState<string | null>(initial.wp_site_id ?? defaultSite?.id ?? null);

  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  const bulletsText = useMemo(() => content.bullets.join("\n"), [content.bullets]);

  // Re-render preview on changes (debounced)
  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await renderPreview({
          data: {
            template,
            content,
            cover_image_url: coverUrl,
            cta_url: ctaUrl || null,
            cta_color: ctaColor,
          },
        });
        setPreviewHtml(r.html);
      } catch {
        // ignore preview errors
      }
    }, 350);
    return () => window.clearTimeout(debounceRef.current);
  }, [template, content, coverUrl, ctaUrl, ctaColor]);

  function buildPayload() {
    return {
      id: initial.id,
      title,
      slug: slug || null,
      template,
      briefing,
      content,
      cover_image_url: coverUrl,
      cta_url: ctaUrl || null,
      cta_color: ctaColor,
      wp_post_type: postType,
      wp_site_id: siteId,
    };
  }

  async function handleSave(silent = false) {
    setSaving(true);
    try {
      await savePresell({ data: buildPayload() });
      if (!silent) toast.success("Salvo!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    if (!briefing.product.trim() || !briefing.benefits.trim()) {
      toast.error("Preencha produto e benefícios primeiro.");
      return;
    }
    setGenerating(true);
    try {
      const r = await generateCopy({ data: { template, briefing } });
      setContent({ trust_badges: [], ...r.content });
      toast.success("Copy gerada com sucesso!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem maior que 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      // Convert to base64 in chunks (large arrays may overflow String.fromCharCode.apply)
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
      }
      const base64 = btoa(binary);
      const r = await uploadCoverImage({
        data: {
          presell_id: initial.id,
          filename: file.name,
          content_type: file.type || "image/jpeg",
          data_base64: base64,
        },
      });
      setCoverUrl(r.url);
      toast.success("Imagem carregada!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handlePublish() {
    if (!siteId) {
      toast.error("Cadastre um site WordPress em Configurações primeiro.");
      return;
    }
    setPublishing(true);
    try {
      await savePresell({ data: buildPayload() });
      const r = await publishToWp({ data: { id: initial.id, status: "publish", site_id: siteId } });
      toast.success("Publicada no WordPress!");
      window.open(r.url, "_blank", "noopener");
      router.invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Button>
          </Link>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 w-[280px] font-display font-semibold"
            placeholder="Título da presell"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sites.length > 0 && (
            <Select value={siteId ?? ""} onValueChange={(v) => setSiteId(v || null)}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Escolher site WP" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.is_default ? " ★" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando…" : "Salvar"}
          </Button>
          <Button onClick={handlePublish} disabled={publishing || !siteId} className="bg-gradient-primary shadow-elegant">
            {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {publishing ? "Publicando…" : "Publicar no WordPress"}
          </Button>
        </div>
      </div>

      {sites.length === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Nenhum site WordPress cadastrado.{" "}
          <Link to="/settings" className="font-semibold underline">Adicionar agora</Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT — Editor */}
        <div className="space-y-4">
          <Section title="Briefing" subtitle="Conte sobre o produto. A IA usa isso pra escrever a copy.">
            <div className="space-y-3">
              <Field label="Produto / oferta">
                <Input value={briefing.product} onChange={(e) => setBriefing({ ...briefing, product: e.target.value })} placeholder="Ex: Curso de Inglês XPTO" />
              </Field>
              <Field label="Nicho">
                <Input value={briefing.niche} onChange={(e) => setBriefing({ ...briefing, niche: e.target.value })} placeholder="Ex: Idiomas / Educação" />
              </Field>
              <Field label="Principais benefícios (1 por linha ou separados por vírgula)">
                <Textarea rows={3} value={briefing.benefits} onChange={(e) => setBriefing({ ...briefing, benefits: e.target.value })} placeholder="Ex: aprende em 90 dias, método sem decoreba, professores nativos" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Público-alvo">
                  <Input value={briefing.audience} onChange={(e) => setBriefing({ ...briefing, audience: e.target.value })} placeholder="Ex: adultos 30-50" />
                </Field>
                <Field label="Tom (opcional)">
                  <Input value={briefing.tone} onChange={(e) => setBriefing({ ...briefing, tone: e.target.value })} placeholder="Ex: amigável, urgente" />
                </Field>
              </div>
              <div className="flex gap-2">
                <Select value={template} onValueChange={(v) => setTemplate(v as TemplateId)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleGenerate} disabled={generating} className="bg-gradient-primary shadow-elegant">
                  {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {generating ? "Gerando…" : "Gerar com IA"}
                </Button>
              </div>
            </div>
          </Section>

          <Section title="Conteúdo da presell" subtitle="Edite o que a IA gerou ou escreva do zero.">
            <div className="space-y-3">
              <Field label="Headline">
                <Input value={content.headline} onChange={(e) => setContent({ ...content, headline: e.target.value })} />
              </Field>
              <Field label="Sub-headline">
                <Input value={content.subheadline} onChange={(e) => setContent({ ...content, subheadline: e.target.value })} />
              </Field>
              <Field label="Corpo (separe parágrafos com linha em branco)">
                <Textarea rows={8} value={content.body} onChange={(e) => setContent({ ...content, body: e.target.value })} />
              </Field>
              <Field label="Bullets de benefícios (1 por linha)">
                <Textarea rows={4} value={bulletsText} onChange={(e) => setContent({ ...content, bullets: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
              </Field>
              <Field label="Prova social / depoimento curto">
                <Textarea rows={2} value={content.social_proof} onChange={(e) => setContent({ ...content, social_proof: e.target.value })} />
              </Field>
              <Field label="Texto do botão (CTA)">
                <Input value={content.cta_label} onChange={(e) => setContent({ ...content, cta_label: e.target.value })} />
              </Field>
              <Field label={`Selos de confiança (1 por linha)${template === "bridge" ? "" : " — aparece no template Bridge Page"}`}>
                <Textarea
                  rows={3}
                  value={(content.trust_badges ?? []).join("\n")}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      trust_badges: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder={"Compra segura\n7 dias de garantia\nFrete grátis\nPagamento 100% protegido"}
                />
              </Field>
            </div>
          </Section>

          <Section title="Imagem de capa">
            <div className="flex items-start gap-3">
              <div className="h-24 w-40 shrink-0 overflow-hidden rounded-lg bg-muted">
                {coverUrl ? (
                  <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Enviando…" : "Enviar imagem (até 5MB)"}
                </Button>
                <Input value={coverUrl ?? ""} onChange={(e) => setCoverUrl(e.target.value || null)} placeholder="Ou cole uma URL: https://…" />
              </div>
            </div>
          </Section>

          <Section title="CTA & Publicação">
            <div className="space-y-3">
              <Field label="Link do botão (afiliado / checkout)">
                <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://…" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cor do botão">
                  <div className="flex items-center gap-2">
                    <input type="color" value={ctaColor} onChange={(e) => setCtaColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent" />
                    <Input value={ctaColor} onChange={(e) => setCtaColor(e.target.value)} className="flex-1" />
                  </div>
                </Field>
                <Field label="Tipo no WordPress">
                  <Select value={postType} onValueChange={(v) => setPostType(v as "page" | "post")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="page">Página</SelectItem>
                      <SelectItem value="post">Post</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Slug (opcional)">
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex: oferta-produto-x" />
              </Field>
              {initial.wp_post_url && (
                <a href={initial.wp_post_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Ver post atual no WordPress <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </Section>
        </div>

        {/* RIGHT — Preview */}
        <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
          <div className="flex h-full flex-col rounded-xl border border-border bg-card shadow-elegant">
            <div className="flex items-center justify-between border-b border-border p-3">
              <div className="text-sm font-semibold">Pré-visualização</div>
              <div className="flex rounded-lg bg-muted p-0.5">
                <button onClick={() => setPreviewMode("desktop")} className={`rounded-md p-1.5 ${previewMode === "desktop" ? "bg-card shadow-sm" : ""}`} title="Desktop">
                  <Monitor className="h-4 w-4" />
                </button>
                <button onClick={() => setPreviewMode("mobile")} className={`rounded-md p-1.5 ${previewMode === "mobile" ? "bg-card shadow-sm" : ""}`} title="Mobile">
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gradient-hero p-4">
              <div className={`mx-auto bg-white shadow-elegant transition-all ${previewMode === "mobile" ? "max-w-[380px]" : "max-w-full"}`}>
                <iframe
                  title="Preview"
                  className="h-[calc(100vh-12rem)] w-full border-0"
                  srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px;">${previewHtml}</body></html>`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}
