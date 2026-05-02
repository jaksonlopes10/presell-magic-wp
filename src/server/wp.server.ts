// Server-only helpers for WordPress REST API and multi-site settings storage.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type WpSite = {
  id: string;
  name: string;
  site_url: string;
  username: string;
  app_password: string;
  is_default: boolean;
};

export type WpSiteInput = {
  name: string;
  site_url: string;
  username: string;
  app_password: string;
  is_default?: boolean;
};

function normalizeUrl(u: string): string {
  return u.trim().replace(/\/$/, "");
}

export async function listWpSites(): Promise<WpSite[]> {
  const { data, error } = await supabaseAdmin
    .from("wp_sites")
    .select("id, name, site_url, username, app_password, is_default")
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw new Error(`Falha ao listar sites: ${error.message}`);
  return (data ?? []) as WpSite[];
}

export async function getWpSite(id: string): Promise<WpSite> {
  const { data, error } = await supabaseAdmin
    .from("wp_sites")
    .select("id, name, site_url, username, app_password, is_default")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Site não encontrado.");
  return data as WpSite;
}

export async function getDefaultWpSite(): Promise<WpSite | null> {
  const { data } = await supabaseAdmin
    .from("wp_sites")
    .select("id, name, site_url, username, app_password, is_default")
    .eq("is_default", true)
    .maybeSingle();
  return (data as WpSite | null) ?? null;
}

export async function createWpSite(input: WpSiteInput): Promise<{ id: string }> {
  // If marking as default, clear others first
  if (input.is_default) {
    const { error: e0 } = await supabaseAdmin
      .from("wp_sites")
      .update({ is_default: false })
      .eq("is_default", true);
    if (e0) throw new Error(e0.message);
  }
  // If no other site exists, force default = true
  const { count } = await supabaseAdmin
    .from("wp_sites")
    .select("id", { count: "exact", head: true });
  const forceDefault = (count ?? 0) === 0;

  const { data, error } = await supabaseAdmin
    .from("wp_sites")
    .insert({
      name: input.name.trim(),
      site_url: normalizeUrl(input.site_url),
      username: input.username.trim(),
      app_password: input.app_password.trim(),
      is_default: forceDefault || Boolean(input.is_default),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function updateWpSite(
  id: string,
  input: Partial<WpSiteInput>,
): Promise<void> {
  if (input.is_default) {
    const { error: e0 } = await supabaseAdmin
      .from("wp_sites")
      .update({ is_default: false })
      .eq("is_default", true)
      .neq("id", id);
    if (e0) throw new Error(e0.message);
  }
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.site_url !== undefined) patch.site_url = normalizeUrl(input.site_url);
  if (input.username !== undefined) patch.username = input.username.trim();
  if (input.app_password !== undefined && input.app_password !== "") {
    patch.app_password = input.app_password.trim();
  }
  if (input.is_default !== undefined) patch.is_default = input.is_default;

  const { error } = await supabaseAdmin
    .from("wp_sites")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteWpSite(id: string): Promise<void> {
  const { data: site } = await supabaseAdmin
    .from("wp_sites")
    .select("is_default")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseAdmin.from("wp_sites").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // If we just deleted the default, promote another to default
  if (site?.is_default) {
    const { data: next } = await supabaseAdmin
      .from("wp_sites")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabaseAdmin
        .from("wp_sites")
        .update({ is_default: true })
        .eq("id", next.id);
    }
  }
}

function authHeader(s: { username: string; app_password: string }): string {
  const token = Buffer.from(`${s.username}:${s.app_password}`).toString("base64");
  return `Basic ${token}`;
}

export async function wpTestConnectionFor(site: WpSite): Promise<{ ok: boolean; message: string }> {
  if (!site.site_url || !site.username || !site.app_password) {
    return { ok: false, message: "Preencha URL do site, usuário e senha de aplicação." };
  }
  try {
    const url = `${normalizeUrl(site.site_url)}/wp-json/wp/v2/users/me?context=edit`;
    const res = await fetch(url, { headers: { Authorization: authHeader(site) } });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `Erro ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as { name?: string };
    return { ok: true, message: `Conectado como ${json.name ?? site.username}` };
  } catch (e) {
    return { ok: false, message: `Erro ao conectar: ${(e as Error).message}` };
  }
}

export type WpPublishInput = {
  postType: "page" | "post";
  title: string;
  slug?: string | null;
  contentHtml: string;
  status: "publish" | "draft";
  existingId?: number | null;
};

export async function wpPublish(site: WpSite, input: WpPublishInput) {
  if (!site.site_url) throw new Error("Site sem URL configurada.");
  const base = `${normalizeUrl(site.site_url)}/wp-json/wp/v2/${input.postType === "page" ? "pages" : "posts"}`;
  const url = input.existingId ? `${base}/${input.existingId}` : base;
  const body: Record<string, unknown> = {
    title: input.title,
    content: input.contentHtml,
    status: input.status,
  };
  if (input.slug) body.slug = input.slug;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(site),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress retornou ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { id: number; link: string };
  return { id: json.id, link: json.link };
}
