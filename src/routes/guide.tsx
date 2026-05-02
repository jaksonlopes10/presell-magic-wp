import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, KeyRound, Plug, Sparkles, Send, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/guide")({
  component: GuidePage,
  head: () => ({
    meta: [
      { title: "Passo a passo — Conectar WordPress e publicar | Presell Builder" },
      { name: "description", content: "Guia rápido para conectar seu WordPress e publicar uma Bridge Page automaticamente em poucos cliques." },
    ],
  }),
});

type StepProps = {
  n: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  cta?: React.ReactNode;
};

function Step({ n, title, icon: Icon, children, cta }: StepProps) {
  return (
    <li className="relative rounded-2xl border border-border bg-card p-6 shadow-elegant">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              Passo {n}
            </span>
          </div>
          <h2 className="mt-2 font-display text-xl font-semibold">{title}</h2>
          <div className="mt-3 space-y-2 text-sm text-foreground/80">{children}</div>
          {cta && <div className="mt-4">{cta}</div>}
        </div>
      </div>
    </li>
  );
}

function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Guia rápido
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
          Conecte seu WordPress e publique sua Bridge Page
        </h1>
        <p className="mt-2 text-muted-foreground">
          Em menos de 5 minutos: ligue uma vez seu site, monte a presell e publique automaticamente.
        </p>
      </div>

      <ol className="space-y-4">
        <Step n={1} title="Verifique seu WordPress" icon={Globe}>
          <p>Você precisa de um site WordPress próprio (auto-hospedado ou em um plano que permita plugins). Tenha em mãos:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>URL do seu site (ex.: <code className="rounded bg-muted px-1">https://meusite.com.br</code>)</li>
            <li>Seu usuário <b>administrador</b> do WP</li>
          </ul>
        </Step>

        <Step
          n={2}
          title="Gere uma Senha de Aplicação no WordPress"
          icon={KeyRound}
          cta={
            <a
              href="https://br.wordpress.org/documentation/article/application-passwords/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver documentação oficial <ExternalLink className="h-3 w-3" />
            </a>
          }
        >
          <ol className="ml-5 list-decimal space-y-1">
            <li>Entre no painel WP → <b>Usuários → Perfil</b>.</li>
            <li>Role até <b>Senhas de Aplicativo</b>.</li>
            <li>Em "Nome do novo aplicativo" digite <code className="rounded bg-muted px-1">Presell Builder</code> → <b>Adicionar</b>.</li>
            <li>Copie a senha gerada (com espaços) e guarde — ela só aparece uma vez.</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            É uma senha separada da sua senha normal, criada só pra essa integração. Você pode revogar a qualquer momento.
          </p>
        </Step>

        <Step
          n={3}
          title="Conecte aqui em Configurações"
          icon={Plug}
          cta={
            <Link to="/settings">
              <Button className="bg-gradient-primary"><Plug className="mr-2 h-4 w-4" /> Abrir Configurações</Button>
            </Link>
          }
        >
          <ol className="ml-5 list-decimal space-y-1">
            <li>Vá em <b>WordPress</b> no menu superior.</li>
            <li>Cole a <b>URL do site</b>, o <b>usuário</b> e a <b>senha de aplicação</b>.</li>
            <li>Clique em <b>Salvar</b>.</li>
            <li>Clique em <b>Testar conexão</b> — deve aparecer "Conectado como ...".</li>
          </ol>
        </Step>

        <Step
          n={4}
          title="Crie uma presell com o template Bridge Page"
          icon={Sparkles}
          cta={
            <Link to="/">
              <Button variant="outline"><Sparkles className="mr-2 h-4 w-4" /> Criar nova presell</Button>
            </Link>
          }
        >
          <ol className="ml-5 list-decimal space-y-1">
            <li>Na home, clique em <b>Nova presell</b>.</li>
            <li>Dê um título interno e escolha <b>Bridge Page</b>.</li>
            <li>No editor, preencha o <b>Briefing</b> (produto, benefícios, público) e clique em <b>Gerar com IA</b>.</li>
            <li>Ajuste headline, bullets, <b>selos de confiança</b> e cole sua <b>URL de afiliado</b> no campo CTA.</li>
            <li>Faça upload da imagem de capa do produto.</li>
          </ol>
        </Step>

        <Step n={5} title="Publique no WordPress automaticamente" icon={Send}>
          <ol className="ml-5 list-decimal space-y-1">
            <li>No topo do editor, escolha <b>Página</b> ou <b>Post</b>.</li>
            <li>Clique em <b>Publicar no WordPress</b>.</li>
            <li>Pronto: o link da página publicada aparece e fica salvo no card da presell.</li>
          </ol>
          <div className="mt-3 rounded-lg bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="mr-1 inline h-4 w-4" />
            Da próxima vez que clicar em publicar a mesma presell, ela <b>atualiza</b> o post existente — não cria duplicado.
          </div>
        </Step>
      </ol>

      <div className="rounded-2xl border border-border bg-accent/30 p-6">
        <h3 className="font-display text-lg font-semibold">Problemas comuns</h3>
        <ul className="mt-3 space-y-2 text-sm text-foreground/80">
          <li><b>Erro 401 ao testar:</b> usuário ou senha de aplicação errados. Gere uma nova.</li>
          <li><b>Erro 404 / rest_no_route:</b> sua hospedagem bloqueia o WP REST API. Habilite ou peça ao suporte.</li>
          <li><b>Funciona em "page" mas não em "post":</b> seu usuário precisa ter permissão de publicar posts.</li>
          <li><b>Imagem não aparece:</b> faça upload da capa antes de publicar — ela vira o destaque do post.</li>
        </ul>
      </div>
    </div>
  );
}
