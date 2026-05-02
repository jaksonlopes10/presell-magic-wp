import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Sparkles, LayoutDashboard, Settings as SettingsIcon, BookOpen } from "lucide-react";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Voltar pro início
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Presell Builder — Crie e publique presells no WordPress com IA" },
      { name: "description", content: "Monte presells de afiliado com templates prontos, copy gerada por IA e publique direto no seu WordPress em um clique." },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NavLink({ to, icon: Icon, children }: { to: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = path === to || (to !== "/" && path.startsWith(to));
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active ? "bg-primary text-primary-foreground shadow-elegant" : "text-foreground/70 hover:bg-accent hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

function RootComponent() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-elegant">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            Presell Builder
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" icon={LayoutDashboard}>Presells</NavLink>
            <NavLink to="/guide" icon={BookOpen}>Guia</NavLink>
            <NavLink to="/settings" icon={SettingsIcon}>Sites WP</NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
