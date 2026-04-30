# Presell Builder — App pessoal para WordPress

Um app web só pra você, onde você monta presells com templates prontos, deixa a IA escrever a copy, pré-visualiza e publica direto no seu site WordPress como página ou post — em um clique.

## Fluxo do usuário

1. Você abre o app e vê suas presells já criadas (rascunhos e publicadas).
2. Clica em "Nova presell" → escolhe um template (Review, Advertorial, Comparação, História, Alerta).
3. Preenche o briefing: nome do produto, nicho, principais benefícios, link de afiliado/checkout, tom de voz.
4. Clica em "Gerar com IA" → a IA escreve headline, sub-headline, copy do corpo, bullets de benefícios, prova social fictícia/editável e CTA.
5. Edita qualquer texto, troca a imagem de capa (upload ou URL), ajusta cor do botão e o link do CTA.
6. Pré-visualiza em desktop e mobile dentro do app.
7. Clica em "Publicar no WordPress" → escolhe se vai como **Página** ou **Post**, define o slug e publica. O app devolve o link público.
8. Pode salvar como rascunho, duplicar, editar depois (re-publica atualizando o mesmo post) ou excluir.

## Telas

- **Configurações WordPress** (primeira coisa a configurar): URL do site, usuário, Application Password. Botão "Testar conexão".
- **Dashboard** — lista de presells com status (Rascunho / Publicada), data, link do WP, ações (editar, duplicar, publicar, excluir).
- **Editor de presell** — coluna esquerda: campos do briefing + botão "Gerar com IA"; coluna direita: preview ao vivo com toggle desktop/mobile.
- **Biblioteca de templates** — cards visuais dos 5 templates pra escolher ao criar.

## Templates incluídos

1. **Review** — análise honesta do produto com prós/contras.
2. **Advertorial** — formato de "matéria de portal".
3. **Comparação** — produto X vs concorrente.
4. **História pessoal** — storytelling antes/depois.
5. **Alerta/Descoberta** — formato curiosidade/notícia.

Cada template tem um HTML responsivo bonito que será injetado no WordPress, com a sua imagem, copy e botão de CTA.

## O que você precisa ter em mãos

- **Site WordPress.org** funcionando (qualquer hospedagem).
- **Application Password**: dentro do WP vá em *Usuários → Perfil → Application Passwords*, gere uma nova e cole no app. (Te mostro o passo a passo na tela de configurações.)
- **Lovable Cloud** será ativada para guardar suas presells, configurações do WP e imagens enviadas.
- **Lovable AI** será usada para a geração de copy (sem precisar de chave de API sua).

## Detalhes técnicos

- Stack: TanStack Start + Tailwind + shadcn/ui (já configurado).
- Lovable Cloud (Supabase) para persistência: tabelas `presells`, `wp_settings`, `templates`. Storage para imagens.
- Lovable AI Gateway (modelo Gemini) para geração de copy via server function.
- Publicação no WordPress via REST API (`/wp-json/wp/v2/pages` ou `/posts`) usando Basic Auth com Application Password — feita em server function pra não expor credenciais no browser.
- Sem sistema de login (uso pessoal). As credenciais do WP ficam guardadas no Cloud, acessadas só pelo backend.

## Fora do escopo (podemos adicionar depois)

- A/B test de headline e CTA
- Tracking de cliques e UTMs automáticas
- Inserção de pixel (Meta/TikTok/GA)
- Multiusuário / contas
- Publicar em WordPress.com
