import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadWpSettings, saveWpSettings, wpTestConnection, wpPublish } from "./wp.server";
import { generatePresellCopy } from "./ai.server";
import { renderTemplate, type PresellContent, type TemplateId } from "./templates";

const TemplateEnum = z.enum(["review", "advertorial", "comparison", "story", "alert", "bridge"]);

const ContentSchema = z.object({
  headline: z.string().default(""),
  subheadline: z.string().default(""),
  body: z.string().default(""),
  bullets: z.array(z.string()).default([]),
  social_proof: z.string().default(""),
  cta_label: z.string().default("Quero saber mais"),
  trust_badges: z.array(z.string()).default([]),
});

const BriefingSchema = z.object({
  product: z.string().default(""),
  niche: z.string().default(""),
  benefits: z.string().default(""),
  audience: z.string().default(""),
  tone: z.string().default(""),
});

// ---------- WP Settings ----------

export const getWpSettings = createServerFn({ method: "GET" }).handler(async () => {
  const s = await loadWpSettings();
  // Mask the password when sending to the client
  return {
    site_url: s.site_url,
    username: s.username,
    has_password: Boolean(s.app_password),
  };
});

export const updateWpSettings = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        site_url: z.string().min(1).max(500),
        username: z.string().min(1).max(200),
        app_password: z.string().min(1).max(500),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    await saveWpSettings(data);
    return { ok: true };
  });

export const testWpConnection = createServerFn({ method: "POST" }).handler(async () => {
  const s = await loadWpSettings();
  return wpTestConnection(s);
});

// ---------- Presells CRUD ----------

export const listPresells = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("presells")
    .select("id,title,slug,template,status,wp_post_url,updated_at,cover_image_url")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return { presells: data ?? [] };
});

export const getPresell = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("presells")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Presell não encontrada.");
    return row;
  });

export const createPresell = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        template: TemplateEnum,
        title: z.string().min(1).max(255).default("Nova presell"),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("presells")
      .insert({
        title: data.title,
        template: data.template,
        briefing: { product: "", niche: "", benefits: "", audience: "", tone: "" },
        content: {
          headline: "",
          subheadline: "",
          body: "",
          bullets: [],
          social_proof: "",
          cta_label: "Quero saber mais",
        },
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const savePresell = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).max(255),
        slug: z.string().max(255).nullable().optional(),
        template: TemplateEnum,
        briefing: BriefingSchema,
        content: ContentSchema,
        cover_image_url: z.string().url().nullable().optional(),
        cta_url: z.string().max(2000).nullable().optional(),
        cta_color: z.string().max(20).nullable().optional(),
        wp_post_type: z.enum(["page", "post"]).default("page"),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("presells")
      .update({
        title: data.title,
        slug: data.slug ?? null,
        template: data.template,
        briefing: data.briefing,
        content: data.content,
        cover_image_url: data.cover_image_url ?? null,
        cta_url: data.cta_url ?? null,
        cta_color: data.cta_color ?? "#16a34a",
        wp_post_type: data.wp_post_type,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePresell = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("presells").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicatePresell = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: src, error: e1 } = await supabaseAdmin
      .from("presells")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!src) throw new Error("Original não encontrada.");
    const { data: row, error: e2 } = await supabaseAdmin
      .from("presells")
      .insert({
        title: `${src.title} (cópia)`,
        slug: null,
        template: src.template,
        briefing: src.briefing,
        content: src.content,
        cover_image_url: src.cover_image_url,
        cta_url: src.cta_url,
        cta_color: src.cta_color,
        wp_post_type: src.wp_post_type,
        status: "draft",
      })
      .select("id")
      .single();
    if (e2) throw new Error(e2.message);
    return { id: row.id };
  });

// ---------- AI generation ----------

export const generateCopy = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        template: TemplateEnum,
        briefing: BriefingSchema,
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    if (!data.briefing.product.trim() || !data.briefing.benefits.trim()) {
      throw new Error("Preencha pelo menos o produto e os benefícios antes de gerar com IA.");
    }
    const content = await generatePresellCopy(data);
    return { content };
  });

// ---------- Render preview HTML ----------

export const renderPreview = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        template: TemplateEnum,
        content: ContentSchema,
        cover_image_url: z.string().url().nullable().optional(),
        cta_url: z.string().max(2000).nullable().optional(),
        cta_color: z.string().max(20).nullable().optional(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const html = renderTemplate({
      template: data.template as TemplateId,
      content: data.content as PresellContent,
      cover_image_url: data.cover_image_url ?? null,
      cta_url: data.cta_url ?? null,
      cta_color: data.cta_color ?? null,
    });
    return { html };
  });

// ---------- Image upload ----------

export const uploadCoverImage = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        presell_id: z.string().uuid(),
        filename: z.string().min(1).max(200),
        content_type: z.string().min(1).max(100),
        data_base64: z.string().min(1).max(8_000_000), // ~6MB raw
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const buf = Buffer.from(data.data_base64, "base64");
    if (buf.length > 5 * 1024 * 1024) throw new Error("Imagem maior que 5 MB.");
    const ext = (data.filename.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
    const path = `${data.presell_id}/${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("presell-images")
      .upload(path, buf, { contentType: data.content_type, upsert: true });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("presell-images").getPublicUrl(path);
    return { url: pub.publicUrl };
  });

// ---------- Publish to WordPress ----------

export const publishToWp = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["publish", "draft"]).default("publish"),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("presells")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Presell não encontrada.");

    const settings = await loadWpSettings();
    if (!settings.site_url || !settings.username || !settings.app_password) {
      throw new Error("Configure o WordPress antes de publicar.");
    }

    const html = renderTemplate({
      template: row.template as TemplateId,
      content: row.content as PresellContent,
      cover_image_url: row.cover_image_url,
      cta_url: row.cta_url,
      cta_color: row.cta_color,
    });

    const result = await wpPublish(settings, {
      postType: (row.wp_post_type as "page" | "post") ?? "page",
      title: row.title,
      slug: row.slug,
      contentHtml: html,
      status: data.status,
      existingId: row.wp_post_id ?? null,
    });

    const { error: e2 } = await supabaseAdmin
      .from("presells")
      .update({
        wp_post_id: result.id,
        wp_post_url: result.link,
        status: data.status === "publish" ? "published" : "draft",
      })
      .eq("id", row.id);
    if (e2) throw new Error(e2.message);

    return { url: result.link, id: result.id };
  });
