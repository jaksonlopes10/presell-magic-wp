// Server-only: call Lovable AI Gateway to generate presell copy.
import type { PresellContent, TemplateId } from "./templates";

const TEMPLATE_INSTRUCTIONS: Record<TemplateId, string> = {
  review:
    "Tom: análise honesta de quem testou o produto. Inclua benefícios concretos e mencione brevemente um pequeno ponto de melhoria pra soar autêntico.",
  advertorial:
    "Tom: matéria de portal de notícias. Comece com um gancho de curiosidade, traga 'pesquisas' e contexto, conclua recomendando o produto.",
  comparison:
    "Tom: comparação direta com concorrentes/alternativas, mostrando por que esse produto vence em pontos específicos.",
  story:
    "Tom: storytelling em primeira pessoa, antes e depois. Conte a transformação, com emoção e detalhes concretos.",
  alert:
    "Tom: descoberta/alerta urgente. Crie senso de novidade ('o que ninguém te contou'), sem prometer coisas falsas.",
  bridge:
    "Tom: bridge page minimalista. Headline = nome da marca/produto curto (ex: 'AquaSculpt®'). Subheadline = tagline curta de 1 linha. Body curto. Bullets = 3 a 4 benefícios objetivos. CTA imperativo em inglês ou português conforme o briefing (ex: 'Click here now to access').",
};

export type GenerateInput = {
  template: TemplateId;
  briefing: {
    product: string;
    niche: string;
    benefits: string;
    audience?: string;
    tone?: string;
  };
};

export async function generatePresellCopy(input: GenerateInput): Promise<PresellContent> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");

  const sys = `Você é um copywriter brasileiro especialista em presells de afiliado de alta conversão.
Escreva em português do Brasil, tom envolvente e direto.
${TEMPLATE_INSTRUCTIONS[input.template]}
Retorne APENAS um JSON válido com as chaves: headline (string), subheadline (string), body (string com 3 a 5 parágrafos separados por linha em branco), bullets (array de 4 a 6 strings curtas), social_proof (string com 1 depoimento curto entre aspas), cta_label (string curta de 2 a 5 palavras).`;

  const user = `Produto: ${input.briefing.product}
Nicho: ${input.briefing.niche}
Principais benefícios: ${input.briefing.benefits}
Público: ${input.briefing.audience || "não especificado"}
Tom desejado: ${input.briefing.tone || "padrão do template"}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
  if (res.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos no Lovable Cloud.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro da IA (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Resposta vazia da IA.");

  let parsed: Partial<PresellContent>;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("A IA retornou um JSON inválido. Tente de novo.");
  }

  return {
    headline: String(parsed.headline ?? ""),
    subheadline: String(parsed.subheadline ?? ""),
    body: String(parsed.body ?? ""),
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets.map(String).slice(0, 8) : [],
    social_proof: String(parsed.social_proof ?? ""),
    cta_label: String(parsed.cta_label ?? "Quero saber mais"),
  };
}
