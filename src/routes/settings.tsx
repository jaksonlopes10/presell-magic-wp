import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Save, Plug, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getWpSettings, updateWpSettings, testWpConnection } from "@/server/presells.functions";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  loader: () => getWpSettings(),
  head: () => ({ meta: [{ title: "Configurações do WordPress — Presell Builder" }] }),
});

function SettingsPage() {
  const initial = Route.useLoaderData();
  const [siteUrl, setSiteUrl] = useState(initial.site_url);
  const [username, setUsername] = useState(initial.username);
  const [appPassword, setAppPassword] = useState("");
  const [hasPassword] = useState(initial.has_password);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSave() {
    if (!siteUrl || !username || !appPassword) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setSaving(true);
    try {
      await updateWpSettings({
        data: { site_url: siteUrl, username, app_password: appPassword },
      });
      toast.success("Configurações salvas!");
      setAppPassword("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testWpConnection();
      setTestResult(r);
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Conectar ao WordPress</h1>
        <p className="mt-2 text-muted-foreground">
          Configure uma vez seu site e a senha de aplicação. As credenciais ficam guardadas com segurança no servidor.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
        <div className="space-y-4">
          <div>
            <Label htmlFor="site_url">URL do seu site</Label>
            <Input
              id="site_url"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://meusite.com.br"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-muted-foreground">Sem barra no final. Ex: <code>https://meusite.com.br</code></p>
          </div>

          <div>
            <Label htmlFor="username">Usuário do WordPress</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="seu-usuario-admin"
              autoComplete="off"
            />
          </div>

          <div>
            <Label htmlFor="app_password">Senha de aplicação</Label>
            <Input
              id="app_password"
              type="password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              placeholder={hasPassword ? "•••••••••• (deixe vazio para manter a atual)" : "xxxx xxxx xxxx xxxx xxxx xxxx"}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              É uma senha diferente da sua senha normal — gerada só pra apps integrarem com o WP.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando…" : "Salvar"}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              <Plug className="mr-2 h-4 w-4" />
              {testing ? "Testando…" : "Testar conexão"}
            </Button>
          </div>

          {testResult && (
            <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${testResult.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {testResult.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-accent/30 p-6">
        <h3 className="font-display text-lg font-semibold">Como gerar a senha de aplicação</h3>
        <ol className="mt-3 space-y-2 text-sm text-foreground/80">
          <li>1. Entre no painel do seu WordPress e vá em <b>Usuários → Perfil</b>.</li>
          <li>2. Role até o final da página, encontre <b>Senhas de Aplicativo</b>.</li>
          <li>3. Em "Nome do novo aplicativo" digite <code className="rounded bg-muted px-1">Presell Builder</code> e clique em <b>Adicionar</b>.</li>
          <li>4. Copie a senha gerada (com espaços) e cole no campo acima.</li>
          <li>5. Pronto — clique em <b>Salvar</b> e depois <b>Testar conexão</b>.</li>
        </ol>
        <a
          href="https://br.wordpress.org/documentation/article/application-passwords/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Documentação oficial <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
