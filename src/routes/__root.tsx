import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Львів Сьогодні — новини Львова та області" },
      { name: "description", content: "Новини Львова та Львівської області: місто, влада, дороги, культура і спорт." },
      { name: "theme-color", content: "#0b4f9c" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,650;6..72,700&display=swap",
      },
      { rel: "alternate", type: "application/rss+xml", title: "Львів Сьогодні", href: "/rss.xml" },
    ],
  }),
  shellComponent: RootShell,
  component: () => (
    <>
      <Outlet />
      <Toaster position="top-right" />
    </>
  ),
  notFoundComponent: () => (
    <main className="grid min-h-screen place-items-center bg-paper px-4 text-center text-ink">
      <div>
        <p className="text-xs uppercase tracking-widest text-accent">404</p>
        <h1 className="mt-2 font-serif text-4xl">Сторінку не знайдено</h1>
        <p className="mt-2 text-muted">Можливо, матеріал зняли з випуску або адресу набрано з помилкою.</p>
        <a href="/" className="mt-4 inline-block bg-ink px-4 py-2 text-sm text-paper">На головну</a>
      </div>
    </main>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>{children}</AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
