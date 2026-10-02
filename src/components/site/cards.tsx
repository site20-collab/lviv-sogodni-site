import { Link } from "@tanstack/react-router";
import { formatWhen } from "@/lib/news/format";
import type { ArticleCard } from "@/lib/news/types";

function Cover({ src, alt, className, priority = false }: { src: string | null; alt: string; className?: string; priority?: boolean }) {
  if (!src) {
    return <div className={`grid place-items-center bg-ink text-paper ${className ?? ""}`}><span className="font-serif text-2xl">ЛС</span></div>;
  }
  return <img src={src} alt={alt} className={`h-full w-full object-cover ${className ?? ""}`} loading={priority ? "eager" : "lazy"} decoding="async" />;
}

export function HeroCard({ article }: { article: ArticleCard }) {
  return (
    <article className="group">
      <Link to="/news/$slug" params={{ slug: article.slug }} search={{ preview: "" }} className="block">
        <div className="aspect-[16/10] overflow-hidden bg-line">
          <Cover src={article.coverUrl} alt={article.coverAlt || article.title} priority className="transition duration-300 group-hover:scale-[1.02]" />
        </div>
        {article.categoryName ? <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-accent">{article.categoryName}</p> : null}
        <h2 className="mt-2 font-serif text-3xl leading-tight sm:text-5xl">{article.title}</h2>
        <p className="mt-3 max-w-2xl text-base text-muted">{article.excerpt}</p>
        <p className="mt-3 text-xs uppercase tracking-wide text-muted">{formatWhen(article.publishedAt)}{article.authorName ? ` · ${article.authorName}` : ""}</p>
      </Link>
    </article>
  );
}

export function SideCard({ article }: { article: ArticleCard }) {
  return (
    <article className="group grid grid-cols-[104px_1fr] gap-3 border-b border-line py-3">
      <Link to="/news/$slug" params={{ slug: article.slug }} search={{ preview: "" }} className="block aspect-[4/3] overflow-hidden bg-line">
        <Cover src={article.coverUrl} alt="" className="transition duration-300 group-hover:scale-[1.03]" />
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{article.categoryName}</p>
        <h3 className="mt-1 font-serif text-lg leading-snug group-hover:text-accent">
          <Link to="/news/$slug" params={{ slug: article.slug }} search={{ preview: "" }}>{article.title}</Link>
        </h3>
        <p className="mt-1 text-xs text-muted">{formatWhen(article.publishedAt)}</p>
      </div>
    </article>
  );
}

export function NewsCard({ article }: { article: ArticleCard }) {
  return (
    <article className="group flex h-full flex-col">
      <Link to="/news/$slug" params={{ slug: article.slug }} search={{ preview: "" }} className="block aspect-[3/2] overflow-hidden bg-line">
        <Cover src={article.coverUrl} alt={article.coverAlt || article.title} className="transition duration-300 group-hover:scale-[1.03]" />
      </Link>
      <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-accent">{article.categoryName}</p>
      <h3 className="mt-1 font-serif text-xl leading-snug">
        <Link to="/news/$slug" params={{ slug: article.slug }} search={{ preview: "" }} className="group-hover:text-accent">{article.title}</Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-sm text-muted">{article.excerpt}</p>
      <p className="mt-auto pt-3 text-xs text-muted">{formatWhen(article.publishedAt)}{article.authorName ? ` · ${article.authorName}` : ""}</p>
    </article>
  );
}

export function CompactCard({ article, index }: { article: ArticleCard; index?: number }) {
  return (
    <article className="flex gap-3 border-b border-line py-3">
      {typeof index === "number" ? <span className="font-serif text-3xl leading-none text-accent tabular-nums">{index}</span> : null}
      <div>
        <h3 className="font-serif text-lg leading-snug">
          <Link to="/news/$slug" params={{ slug: article.slug }} search={{ preview: "" }} className="hover:text-accent">{article.title}</Link>
        </h3>
        <p className="mt-1 text-xs text-muted">{article.categoryName} · {formatWhen(article.publishedAt)}</p>
      </div>
    </article>
  );
}

export function SectionBlock({ title, href, items }: { title: string; href: string; items: ArticleCard[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-end justify-between border-b border-ink pb-2">
        <h2 className="font-serif text-3xl">{title}</h2>
        <a href={href} className="text-sm font-medium text-accent">Більше новин</a>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => <NewsCard key={item.id} article={item} />)}
      </div>
    </section>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="border border-dashed border-line px-4 py-10 text-center text-muted">{text}</p>;
}

export function Pager({ page, pages, makeHref }: { page: number; pages: number; makeHref: (page: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Сторінки">
      {page > 1 ? <a className="border border-line px-3 py-2 text-sm" href={makeHref(page - 1)}>Назад</a> : null}
      <span className="px-2 text-sm tabular-nums">{page} / {pages}</span>
      {page < pages ? <a className="border border-line px-3 py-2 text-sm" href={makeHref(page + 1)}>Далі</a> : null}
    </nav>
  );
}
