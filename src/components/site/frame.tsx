import { Link } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { formatDateUk } from "@/lib/news/format";
import type { ArticleCard, Chrome } from "@/lib/news/types";
import { CookieBanner, readConsent, type Consent } from "./consent";

const SOCIAL = [
  ["telegram", "Telegram"],
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["youtube", "YouTube"],
  ["tiktok", "TikTok"],
  ["x", "X"],
] as const;

export function SiteFrame({ chrome, children }: { chrome: Chrome; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [consent, setConsent] = useState<Consent | null>(null);
  useEffect(() => setConsent(readConsent()), []);
  const today = formatDateUk(new Date());

  return (
    <div className="min-h-screen bg-paper text-ink">
      <a href="#zmist" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        До змісту
      </a>
      <div className="h-1 bg-accent" />
      <div className="border-b border-line bg-card text-muted">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs">
          <p>
            {today}
            <span className="mx-2">·</span>
            Львів
            {chrome.weather ? (
              <span>
                <span className="mx-2">·</span>
                {chrome.weather.temp > 0 ? "+" : ""}
                {chrome.weather.temp}° {chrome.weather.label}
              </span>
            ) : null}
          </p>
          <div className="hidden items-center gap-3 sm:flex">
            {SOCIAL.map(([key, label]) => (
              <a key={key} href={chrome.settings.socials[key]} className="hover:text-accent" rel="noreferrer">
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b-4 border-accent bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button type="button" className="grid size-11 place-items-center border border-line lg:hidden" aria-label="Меню" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </button>
          <Link to="/" className="min-w-0 flex-1 text-center lg:flex-none lg:text-left">
            <span className="block font-serif text-2xl leading-none tracking-tight sm:text-4xl">ЛЬВІВ СЬОГОДНІ</span>
            <span className="mt-1 hidden text-xs uppercase tracking-widest text-muted sm:block">{chrome.settings.tagline}</span>
          </Link>
          <form action="/search" className="ml-auto hidden items-center border border-line bg-card md:flex">
            <label className="sr-only" htmlFor="site-search">Пошук</label>
            <input id="site-search" name="q" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Пошук новин" className="w-48 bg-transparent px-3 py-2 text-sm outline-none lg:w-64" />
            <button type="submit" className="grid size-10 place-items-center" aria-label="Шукати">
              <Search className="size-4" />
            </button>
          </form>
          <Link to="/search" search={{ q: "", page: 1, sort: "relevance" }} className="ml-auto grid size-11 place-items-center border border-line md:hidden" aria-label="Пошук">
            <Search className="size-5" />
          </Link>
        </div>
        <nav className="mx-auto hidden max-w-7xl gap-1 px-4 pb-2 lg:flex" aria-label="Головне меню">
          {chrome.menu.map((item) => (
            <a key={item.id} href={item.url} className="px-2 py-2 text-sm font-medium uppercase tracking-wide hover:text-accent">
              {item.label}
            </a>
          ))}
        </nav>
      </header>
      {open ? (
        <div className="fixed inset-0 z-50 bg-ink/40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-80 max-w-[85%] bg-paper p-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-serif text-xl">Меню</p>
              <button type="button" className="grid size-11 place-items-center" aria-label="Закрити" onClick={() => setOpen(false)}>
                <X className="size-5" />
              </button>
            </div>
            <nav className="mt-4 flex flex-col" aria-label="Мобільне меню">
              {chrome.menu.map((item) => (
                <a key={item.id} href={item.url} className="border-b border-line py-3 text-lg" onClick={() => setOpen(false)}>
                  {item.label}
                </a>
              ))}
              <Link to="/admin" className="py-3 text-sm uppercase tracking-wide text-accent">Редакція</Link>
            </nav>
          </div>
        </div>
      ) : null}
      <Breaking items={chrome.breaking} />
      <main id="zmist">{children}</main>
      <footer className="mt-16 border-t-4 border-accent bg-card text-ink">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-serif text-2xl">Львів Сьогодні</p>
            <p className="mt-3 text-sm text-muted">{chrome.settings.description}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-accent">Рубрики</p>
            <ul className="mt-3 space-y-2 text-sm">
              {chrome.menu.slice(1, 7).map((item) => (
                <li key={item.id}><a href={item.url} className="hover:text-accent">{item.label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-accent">Видання</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/about" className="hover:underline">Про нас</Link></li>
              <li><Link to="/contact" className="hover:underline">Контакти</Link></li>
              <li><Link to="/privacy" className="hover:underline">Конфіденційність</Link></li>
              <li><Link to="/terms" className="hover:underline">Правила</Link></li>
              <li><Link to="/cookies" className="hover:underline">Cookie</Link></li>
              <li><Link to="/admin/login" className="hover:underline">Вхід для редакції</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-accent">Соцмережі</p>
            <ul className="mt-3 space-y-2 text-sm">
              {SOCIAL.map(([key, label]) => (
                <li key={key}><a href={chrome.settings.socials[key]}>{label}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-line px-4 py-4 text-center text-xs text-muted">
          © {new Date().getFullYear()} {chrome.settings.siteName}. Демонстраційне наповнення.
        </div>
      </footer>
      <CookieBanner consent={consent} onChange={setConsent} />
    </div>
  );
}

function Breaking({ items }: { items: ArticleCard[] }) {
  if (items.length === 0) return null;
  const row = [...items, ...items];
  return (
    <div className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-7xl items-stretch">
        <p className="shrink-0 bg-accent px-3 py-2 text-xs font-semibold uppercase tracking-widest text-accent-ink">Останні</p>
        <div className="overflow-hidden">
          <div className="ls-ticker flex w-max gap-8 py-2 pr-8">
            {row.map((item, index) => (
              <Link key={`${item.id}-${index}`} to="/news/$slug" params={{ slug: item.slug }} search={{ preview: "" }} className="flex items-baseline gap-3 whitespace-nowrap text-sm hover:text-accent">
                <time className="text-xs text-muted tabular-nums">{item.publishedAt ? new Date(item.publishedAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Kyiv" }) : ""}</time>
                <span>{item.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Newsletter({ note }: { note?: string }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState("");
  return (
    <form
      className="border-y border-line bg-accent/5 px-4 py-10 text-ink"
      onSubmit={async (event) => {
        event.preventDefault();
        const { subscribeNews } = await import("@/lib/news/public.functions");
        try {
          await subscribeNews({ data: { email, company: "" } });
          setDone("Адресу збережено. Листи підключимо, коли з’явиться поштовий сервіс.");
          setEmail("");
        } catch (error) {
          setDone(error instanceof Error ? error.message : "Не вдалося підписати");
        }
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-serif text-3xl">Отримуйте головні новини Львова</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">Короткий дайджест без зайвих листів. Адресу можна видалити в редакції.</p>
        </div>
        <div className="flex w-full max-w-md flex-col gap-2">
          <label className="sr-only" htmlFor="news-email">Електронна пошта</label>
          <div className="flex">
            <input id="news-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ваша@пошта" className="w-full border border-line bg-paper px-3 py-3 text-ink" />
            <button type="submit" className="bg-accent px-4 text-sm font-semibold text-accent-ink">Підписатися</button>
          </div>
          <input className="hidden" tabIndex={-1} autoComplete="off" aria-hidden name="company" />
          <p className="text-xs text-muted">{done || note || "Надсилаючи адресу, ви погоджуєтесь із політикою конфіденційності."}</p>
        </div>
      </div>
    </form>
  );
}
