import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Plug, CheckCircle2, AlertCircle, ExternalLink, Star, Pencil, Trash2, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  listWpSitesFn, createWpSiteFn, updateWpSiteFn, deleteWpSiteFn, testWpSiteFn,
} from "@/server/presells.functions";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  loader: () => listWpSitesFn(),
  head: () => ({ meta: [{ title: "Sites WordPress — Presell Builder" }] }),
});

type SiteRow = {
  id: string;
  name: string;
  site_url: string;
  username: string;
  is_default: boolean;
  has_password: boolean;
};

function SettingsPage() {
  const initial = Route.useLoaderData();
  const [sites, setSites] = useState<SiteRow[]>(initial.sites);
  const [editing, setEditing] = useState<SiteRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  async function refresh() {
    const r = await listWpSitesFn();
    setSites(r.sites);
  }

  async function handleTest(id: string) {
    setTestingId(id);
    try {
      const r = await testWpSiteFn({ data: { id } });
      setTestResults((p) => ({ ...p, [id]: r }));
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    } finally {
      setTestingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este site? As presells publicadas continuam no WordPress, só perdem o vínculo aqui.")) return;
    try {
      await deleteWpSiteFn({ data: { id } });
      toast.success("Site removido.");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await updateWpSiteFn({ data: { id, is_default: true } });
      toast.success("Definido como padrão.");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Sites WordPress</h1>
          <p className="mt-2 text-muted-foreground">
            Cadastre vários sites e escolha em qual publicar cada presell. O marcado como <b>padrão</b> é usado quando você não escolhe.
          </p>
        </div>
        <Button className="bg-gradient-primary" onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar site
        </Button>
      </div>

      {sites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Plug className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold">Nenhum site cadastrado</h3>
          <p className="mt-2 text-sm text-muted-foreground">Adicione seu primeiro WordPress pra começar a publicar.</p>
          <Button className="mt-4 bg-gradient-primary" onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar site
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {sites.map((s) => (
            <li key={s.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-lg font-semibold">{s.name}</h3>
                    {s.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        <Star className="h-3 w-3 fill-current" /> Padrão
                      </span>
                    )}
                  </div>
                  <a href={s.site_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary hover:underline">
                    {s.site_url} <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="mt-1 text-xs text-muted-foreground">Usuário: <code className="rounded bg-muted px-1">{s.username}</code></div>
                  {testResults[s.id] && (
                    <div className={`mt-2 inline-flex items-start gap-1.5 rounded-md px-2 py-1 text-xs ${testResults[s.id].ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {testResults[s.id].ok ? <CheckCircle2 className="mt-0.5 h-3 w-3" /> : <AlertCircle className="mt-0.5 h-3 w-3" />}
                      <span>{testResults[s.id].message}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {!s.is_default && (
                    <Button size="sm" variant="ghost" onClick={() => handleSetDefault(s.id)} title="Marcar como padrão">
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleTest(s.id)} disabled={testingId === s.id}>
                    <Plug className="mr-1.5 h-3.5 w-3.5" />
                    {testingId === s.id ? "Testando…" : "Testar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(s)} title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)} title="Excluir">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-2xl border border-border bg-accent/30 p-6">
        <h3 className="font-display text-lg font-semibold">Como gerar a senha de aplicação</h3>
        <ol className="mt-3 space-y-2 text-sm text-foreground/80">
          <li>1. No painel do WP, vá em <b>Usuários → Perfil</b>.</li>
          <li>2. Role até <b>Senhas de Aplicativo</b>.</li>
          <li>3. Em "Nome do novo aplicativo" digite <code className="rounded bg-muted px-1">Presell Builder</code> → <b>Adicionar</b>.</li>
          <li>4. Copie a senha gerada (com espaços) e cole no formulário do site.</li>
        </ol>
        <a href="https://br.wordpress.org/documentation/article/application-passwords/" target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Documentação oficial <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <SiteFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={refresh}
        mode="create"
      />
      <SiteFormDialog
        open={Boolean(editing)}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={refresh}
        mode="edit"
        initial={editing}
      />
    </div>
  );
}

function SiteFormDialog({
  open, onOpenChange, onSaved, mode, initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
  mode: "create" | "edit";
  initial?: SiteRow | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [siteUrl, setSiteUrl] = useState(initial?.site_url ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [appPassword, setAppPassword] = useState("");
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [saving, setSaving] = useState(false);

  // Reset when dialog opens for a different row
  useState(() => undefined);
  if (open && initial && initial.id !== (initial as SiteRow).id) {
    // no-op
  }

  async function handleSubmit() {
    if (!name || !siteUrl || !username) {
      toast.error("Preencha nome, URL e usuário.");
      return;
    }
    if (mode === "create" && !appPassword) {
      toast.error("Cole a senha de aplicação.");
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        await createWpSiteFn({
          data: { name, site_url: siteUrl, username, app_password: appPassword, is_default: isDefault },
        });
        toast.success("Site adicionado!");
      } else if (initial) {
        await updateWpSiteFn({
          data: {
            id: initial.id,
            name, site_url: siteUrl, username,
            app_password: appPassword || undefined,
            is_default: isDefault,
          },
        });
        toast.success("Site atualizado!");
      }
      onSaved();
      onOpenChange(false);
      setAppPassword("");
      if (mode === "create") {
        setName(""); setSiteUrl(""); setUsername(""); setIsDefault(false);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Adicionar site WordPress" : "Editar site"}</DialogTitle>
          <DialogDescription>
            Use uma <b>senha de aplicação</b> gerada no perfil do WordPress.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome (interno)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Site Emagrecimento" />
          </div>
          <div>
            <Label>URL do site</Label>
            <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://meusite.com.br" autoComplete="off" />
            <p className="mt-1 text-xs text-muted-foreground">Sem barra no final.</p>
          </div>
          <div>
            <Label>Usuário do WordPress</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="seu-usuario" autoComplete="off" />
          </div>
          <div>
            <Label>Senha de aplicação</Label>
            <Input
              type="password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              placeholder={mode === "edit" ? "Deixe vazio para manter a atual" : "xxxx xxxx xxxx xxxx xxxx xxxx"}
              autoComplete="new-password"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4" />
            Marcar como site padrão
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="mr-1 h-4 w-4" /> Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-gradient-primary">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
