// Server-only helpers for WordPress REST API and settings storage.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type WpSettings = {
  site_url: string;
  username: string;
  app_password: string;
};

export async function loadWpSettings(): Promise<WpSettings> {
  const { data, error } = await supabaseAdmin
    .from("wp_settings")
    .select("site_url, username, app_password")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`Falha ao ler configurações do WP: ${error.message}`);
  return {
    site_url: data?.site_url ?? "",
    username: data?.username ?? "",
    app_password: data?.app_password ?? "",
  };
}

export async function saveWpSettings(s: WpSettings): Promise<void> {
  const { error } = await supabaseAdmin
    .from("wp_settings")
    .update({
      site_url: s.site_url.trim().replace(/\/$/, ""),
      username: s.username.trim(),
      app_password: s.app_password.trim(),
    })
    .eq("id", 1);
  if (error) throw new Error(`Falha ao salvar configurações: ${error.message}`);
}

function authHeader(s: WpSettings): string {
  // Application passwords use Basic auth. The space inside the password is allowed.
  const token = Buffer.from(`${s.username}:${s.app_password}`).toString("base64");
  return `Basic ${token}`;
}

export async function wpTestConnection(s: WpSettings): Promise<{ ok: boolean; message: string }> {
  if (!s.site_url || !s.username || !s.app_password) {
    return { ok: false, message: "Preencha URL do site, usuário e senha de aplicação." };
  }
  try {
    const url = `${s.site_url.replace(/\/$/, "")}/wp-json/wp/v2/users/me?context=edit`;
    const res = await fetch(url, { headers: { Authorization: authHeader(s) } });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `Erro ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as { name?: string };
    return { ok: true, message: `Conectado como ${json.name ?? s.username}` };
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

export async function wpPublish(s: WpSettings, input: WpPublishInput) {
  if (!s.site_url) throw new Error("Configure o WordPress primeiro.");
  const base = `${s.site_url.replace(/\/$/, "")}/wp-json/wp/v2/${input.postType === "page" ? "pages" : "posts"}`;
  const url = input.existingId ? `${base}/${input.existingId}` : base;
  const body: Record<string, unknown> = {
    title: input.title,
    content: input.contentHtml,
    status: input.status,
  };
  if (input.slug) body.slug = input.slug;

  const res = await fetch(url, {
    method: input.existingId ? "POST" : "POST", // WP accepts POST for both create and update
    headers: {
      Authorization: authHeader(s),
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
