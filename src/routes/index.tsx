import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, ExternalLink, Copy, Trash2, Pencil, FileText, Sparkles, Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listPresells, createPresell, deletePresell, duplicatePresell, listWpSitesFn, publishBatchToWp,
} from "@/server/presells.functions";
import { TEMPLATES, type TemplateId } from "@/server/templates";

export const Route = createFileRoute("/")({
  component: Dashboard,
  loader: async () => {
    const [presells, sitesRes] = await Promise.all([listPresells(), listWpSitesFn()]);
    return { presells: presells.presells, sites: sitesRes.sites };
  },
});

function Dashboard() {
  const router = useRouter();
  const initial = Route.useLoaderData();
  const [presells, setPresells] = useState(initial.presells);
  const [sites, setSites] = useState(initial.sites);
  const [openNew, setOpenNew] = useState(false);
  const [title, setTitle] = useState("Nova presell");
  const [template, setTemplate] = useState<TemplateId>("review");
  const [creating, setCreating] = useState(false);

  // Batch selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const defaultSite = useMemo(() => sites.find((s) => s.is_default) ?? sites[0] ?? null, [sites]);
  const [batchSiteId, setBatchSiteId] = useState<string | null>(defaultSite?.id ?? null);
  const [publishingBatch, setPublishingBatch] = useState(false);

  useEffect(() => {
    setPresells(initial.presells);
    setSites(initial.sites);
  }, [initial]);

  useEffect(() => {
    if (!batchSiteId && defaultSite) setBatchSiteId(defaultSite.id);
  }, [defaultSite, batchSiteId]);

  async function refresh() {
    const r = await listPresells();
    setPresells(r.presells);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const r = await createPresell({ data: { title, template } });
      setOpenNew(false);
      router.navigate({ to: "/editor/$id", params: { id: r.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta presell? Isso não remove o post do WordPress.")) return;
    try {
      await deletePresell({ data: { id } });
      toast.success("Presell excluída.");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const r = await duplicatePresell({ data: { id } });
      toast.success("Duplicada!");
      router.navigate({ to: "/editor/$id", params: { id: r.id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function toggleOne(id: string) {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === presells.length) setSelected(new Set());
    else setSelected(new Set(presells.map((p) => p.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handlePublishBatch() {
    if (!batchSiteId) {
      toast.error("Escolha um site WordPress.");
      return;
    }
    if (selected.size === 0) return;
    const siteName = sites.find((s) => s.id === batchSiteId)?.name ?? "site escolhido";
    if (!confirm(`Publicar ${selected.size} presell(s) em "${siteName}"?`)) return;
    setPublishingBatch(true);
    try {
      const r = await publishBatchToWp({
        data: { ids: Array.from(selected), site_id: batchSiteId, status: "publish" },
      });
      if (r.fail_count === 0) {
        toast.success(`${r.ok_count} publicada(s) com sucesso!`);
      } else {
        toast.warning(`${r.ok_count} ok, ${r.fail_count} com erro. Veja os detalhes no console.`);
        console.warn("Falhas no batch:", r.results.filter((x) => !x.ok));
      }
      clearSelection();
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPublishingBatch(false);
    }
  }

  const allSelected = presells.length > 0 && selected.size === presells.length;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-gradient-hero p-8 ring-1 ring-border">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl font-bold tracking-tight">Suas presells</h1>
            <p className="mt-2 text-muted-foreground">
              Monte com template + IA, publique direto no seu WordPress em um clique — ou em lote para vários sites.
            </p>
          </div>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-primary shadow-elegant hover:opacity-95">
                <Plus className="mr-2 h-4 w-4" />
                Nova presell
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova presell</DialogTitle>
                <DialogDescription>Escolha um template para começar.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título interno</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Review do Produto X" />
                </div>
                <div>
                  <Label>Template</Label>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTemplate(t.id)}
                        className={`rounded-lg border p-3 text-left transition ${
                          template === t.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-accent"
                        }`}
                      >
                        <div className="font-semibold text-sm">{t.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{t.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={creating} className="bg-gradient-primary">
                  {creating ? "Criando…" : "Criar e abrir editor"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* Batch action bar */}
      {presells.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4"
            />
            {selected.size > 0
              ? `${selected.size} selecionada(s)`
              : "Selecionar todas"}
          </label>

          {selected.size > 0 && (
            <>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Publicar em:</span>
                {sites.length === 0 ? (
                  <Link to="/settings" className="text-sm font-semibold text-primary underline">
                    Cadastrar site
                  </Link>
                ) : (
                  <Select value={batchSiteId ?? ""} onValueChange={(v) => setBatchSiteId(v || null)}>
                    <SelectTrigger className="h-9 w-[220px]">
                      <SelectValue placeholder="Escolha o site" />
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
                <Button
                  onClick={handlePublishBatch}
                  disabled={publishingBatch || !batchSiteId || sites.length === 0}
                  className="bg-gradient-primary shadow-elegant"
                >
                  {publishingBatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {publishingBatch ? "Publicando…" : `Publicar ${selected.size}`}
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {presells.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold">Nenhuma presell ainda</h3>
          <p className="mt-2 text-sm text-muted-foreground">Crie sua primeira presell para começar.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presells.map((p: typeof presells[number]) => {
            const isSel = selected.has(p.id);
            const siteName = sites.find((s) => s.id === p.wp_site_id)?.name;
            return (
              <li
                key={p.id}
                className={`group flex flex-col overflow-hidden rounded-xl border bg-card transition hover:shadow-elegant ${
                  isSel ? "border-primary ring-2 ring-primary/30" : "border-border"
                }`}
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                  <label className="absolute left-2 top-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-background/90 shadow-sm backdrop-blur">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleOne(p.id)}
                      className="h-4 w-4"
                    />
                  </label>
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-hero">
                      <FileText className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-semibold leading-tight line-clamp-2">{p.title}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      p.status === "published" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {p.status === "published" ? "Publicada" : "Rascunho"}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <div>Template: <span className="capitalize">{p.template}</span></div>
                    {siteName && <div>Site: <span className="font-medium text-foreground/80">{siteName}</span></div>}
                  </div>
                  <div className="mt-auto flex items-center gap-1 pt-2">
                    <Link to="/editor/$id" params={{ id: p.id }} className="flex-1">
                      <Button size="sm" variant="default" className="w-full">
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                      </Button>
                    </Link>
                    {p.wp_post_url && (
                      <a href={p.wp_post_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" title="Abrir no WordPress">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleDuplicate(p.id)} title="Duplicar">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
