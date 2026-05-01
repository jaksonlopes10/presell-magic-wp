// HTML templates for presells. Pure functions, safe to import on client and server.
export type TemplateId = "review" | "advertorial" | "comparison" | "story" | "alert" | "bridge";

export const TEMPLATES: { id: TemplateId; name: string; description: string }[] = [
  { id: "bridge", name: "Bridge Page", description: "Minimalista: logo, produto, CTA e selos. Estilo AquaSculpt." },
  { id: "review", name: "Review", description: "Análise honesta do produto com prós e contras." },
  { id: "advertorial", name: "Advertorial", description: "Formato matéria de portal de notícias." },
  { id: "comparison", name: "Comparação", description: "Produto X vs concorrente." },
  { id: "story", name: "História pessoal", description: "Storytelling antes/depois." },
  { id: "alert", name: "Alerta/Descoberta", description: "Formato curiosidade/notícia." },
];

export type PresellContent = {
  headline: string;
  subheadline: string;
  body: string; // markdown-like, supports double newlines as paragraph breaks
  bullets: string[];
  social_proof: string;
  cta_label: string;
};

export type RenderInput = {
  template: TemplateId;
  content: PresellContent;
  cover_image_url?: string | null;
  cta_url?: string | null;
  cta_color?: string | null;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraphs(body: string): string {
  return body
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

function bulletsHtml(items: string[]): string {
  if (!items?.length) return "";
  return `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
}

function ctaButton(url: string, label: string, color: string): string {
  const safeUrl = escapeHtml(url || "#");
  const safeLabel = escapeHtml(label || "Quero saber mais");
  const safeColor = /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : "#16a34a";
  return `<p style="text-align:center;margin:32px 0;"><a href="${safeUrl}" rel="nofollow sponsored noopener" target="_blank" style="display:inline-block;background:${safeColor};color:#fff;padding:16px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:18px;">${safeLabel} →</a></p>`;
}

function coverImg(url?: string | null): string {
  if (!url) return "";
  return `<p style="text-align:center;margin-bottom:24px;"><img src="${escapeHtml(url)}" alt="" style="max-width:100%;height:auto;border-radius:12px;" /></p>`;
}

export function renderTemplate(input: RenderInput): string {
  const { template, content, cover_image_url, cta_url, cta_color } = input;
  const cta = ctaButton(cta_url || "#", content.cta_label, cta_color || "#16a34a");
  const cover = coverImg(cover_image_url);
  const headline = escapeHtml(content.headline);
  const subheadline = escapeHtml(content.subheadline);
  const social = content.social_proof
    ? `<blockquote style="border-left:4px solid #e5e7eb;padding:8px 16px;color:#374151;font-style:italic;">${escapeHtml(content.social_proof)}</blockquote>`
    : "";

  const wrapper = (inner: string) =>
    `<div style="max-width:720px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#111827;">${inner}</div>`;

  switch (template) {
    case "advertorial":
      return wrapper(
        `<p style="text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-size:12px;font-weight:700;">PUBLIEDITORIAL</p>
         <h1 style="font-size:32px;line-height:1.2;margin:8px 0 16px;">${headline}</h1>
         <p style="color:#6b7280;font-size:16px;margin-bottom:24px;">${subheadline}</p>
         ${cover}
         ${paragraphs(content.body)}
         ${bulletsHtml(content.bullets)}
         ${social}
         ${cta}`
      );
    case "comparison":
      return wrapper(
        `<h1 style="font-size:32px;line-height:1.2;text-align:center;">${headline}</h1>
         <p style="text-align:center;color:#6b7280;font-size:18px;">${subheadline}</p>
         ${cover}
         ${paragraphs(content.body)}
         <h3>Por que vale a pena:</h3>
         ${bulletsHtml(content.bullets)}
         ${social}
         ${cta}`
      );
    case "story":
      return wrapper(
        `<h1 style="font-size:30px;line-height:1.2;">${headline}</h1>
         <p style="color:#6b7280;font-size:18px;font-style:italic;">${subheadline}</p>
         ${cover}
         ${paragraphs(content.body)}
         ${bulletsHtml(content.bullets)}
         ${social}
         ${cta}`
      );
    case "alert":
      return wrapper(
        `<p style="background:#fef3c7;color:#92400e;padding:8px 12px;border-radius:6px;display:inline-block;font-weight:700;font-size:13px;">⚠️ ATENÇÃO</p>
         <h1 style="font-size:32px;line-height:1.2;margin:12px 0;">${headline}</h1>
         <p style="color:#6b7280;font-size:18px;">${subheadline}</p>
         ${cover}
         ${paragraphs(content.body)}
         ${bulletsHtml(content.bullets)}
         ${social}
         ${cta}`
      );
    case "bridge": {
      // Minimalista estilo AquaSculpt: marca + estrelas + produto + CTA + selos
      const brand = headline || "Brand®";
      const tagline = subheadline;
      const ctaUrl = escapeHtml(cta_url || "#");
      const ctaColor = /^#[0-9a-fA-F]{3,8}$/.test(cta_color || "") ? cta_color! : "#16a34a";
      const ctaLabel = escapeHtml(content.cta_label || "Click here now to access");
      const productImg = cover_image_url
        ? `<a href="${ctaUrl}" rel="nofollow sponsored noopener" target="_blank"><img src="${escapeHtml(cover_image_url)}" alt="${brand}" style="max-width:520px;width:100%;height:auto;margin:0 auto;display:block;" /></a>`
        : "";
      const bulletsBlock = content.bullets?.length
        ? `<ul style="max-width:520px;margin:24px auto;padding-left:20px;color:#374151;font-size:16px;">${content.bullets.map((b) => `<li style="margin:6px 0;">${escapeHtml(b)}</li>`).join("")}</ul>`
        : "";
      return `<div style="max-width:720px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:24px 16px;color:#111827;">
        <h1 style="font-size:42px;line-height:1.1;color:#374771;font-weight:700;margin:0 0 4px;">${escapeHtml(brand)}</h1>
        <p style="color:#f59e0b;font-size:24px;margin:0 0 8px;letter-spacing:2px;">★★★★★</p>
        ${tagline ? `<p style="color:#6b7280;font-size:16px;margin:0 0 24px;">${tagline}</p>` : ""}
        ${productImg}
        ${bulletsBlock}
        <p style="margin:24px 0;"><a href="${ctaUrl}" rel="nofollow sponsored noopener" target="_blank" style="display:inline-block;background:${ctaColor};color:#fff;padding:18px 40px;border-radius:8px;font-weight:700;text-decoration:none;font-size:20px;box-shadow:0 4px 14px rgba(22,163,74,0.3);">${ctaLabel} →</a></p>
        ${social ? `<div style="max-width:520px;margin:24px auto;">${social}</div>` : ""}
        <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:8px 0;">
            <a href="#" style="color:#9ca3af;text-decoration:none;">Privacy Policy</a> |
            <a href="#" style="color:#9ca3af;text-decoration:none;">Terms &amp; Conditions</a> |
            <a href="#" style="color:#9ca3af;text-decoration:none;">Refunds</a> |
            <a href="#" style="color:#9ca3af;text-decoration:none;">Contact Us</a>
          </p>
          <p style="color:#9ca3af;font-size:11px;line-height:1.5;margin:12px auto;max-width:560px;">
            All statements and results presented on this website are for informational purposes only. They are not specific medical advice for any individual. Results may vary. Consult your physician before starting any new product. This page may contain affiliate links and we may earn a commission if you purchase through them.
          </p>
          <p style="color:#9ca3af;font-size:11px;margin:8px 0;">© ${new Date().getFullYear()} ${escapeHtml(brand)}. All Rights Reserved.</p>
        </div>
      </div>`;
    }
    case "review":
    default:
      return wrapper(
        `<p style="color:#f59e0b;font-size:20px;">★★★★★</p>
         <h1 style="font-size:32px;line-height:1.2;margin:8px 0 16px;">${headline}</h1>
         <p style="color:#6b7280;font-size:18px;margin-bottom:24px;">${subheadline}</p>
         ${cover}
         ${paragraphs(content.body)}
         <h3>Principais benefícios:</h3>
         ${bulletsHtml(content.bullets)}
         ${social}
         ${cta}`
      );
  }
}
