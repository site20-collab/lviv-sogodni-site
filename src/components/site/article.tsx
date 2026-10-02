import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { formatWhen } from "@/lib/news/format";
import { renderInline, videoEmbed } from "@/lib/news/richtext";
import type { ArticleDetail, Block } from "@/lib/news/types";
import { postComment } from "@/lib/news/public.functions";
import { CompactCard } from "./cards";
import { AdFrame, readConsent } from "./consent";

type ArticleWithAds = ArticleDetail & {
  ads?: { top: { id: string; code: string }[]; middle: { id: string; code: string }[]; bottom: { id: string; code: string }[] };
};

function BlockView({ block }: { block: Block }) {
  if (block.type === "p") return <p dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} />;
  if (block.type === "h2") return <h2 dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} />;
  if (block.type === "h3") return <h3 dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} />;
  if (block.type === "quote") {
    return (
      <blockquote>
        <p dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} />
        {block.cite ? <footer className="caption mt-2">— {block.cite}</footer> : null}
      </blockquote>
    );
  }
  if (block.type === "ul" || block.type === "ol") {
    const Tag = block.type === "ol" ? "ol" : "ul";
    return (
      <Tag className={block.type === "ol" ? "list-decimal pl-5" : "list-disc pl-5"}>
        {block.items.map((item) => <li key={item} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />)}
      </Tag>
    );
  }
  if (block.type === "image") {
    return (
      <figure>
        <img src={block.url} alt={block.alt} className="w-full" loading="lazy" />
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
      </figure>
    );
  }
  if (block.type === "video") {
    const embed = videoEmbed(block.url);
    return embed ? (
      <figure>
        <div className="aspect-video">
          <iframe title={block.caption || "Відео"} src={embed} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
      </figure>
    ) : <p><a href={block.url}>{block.caption || block.url}</a></p>;
  }
  if (block.type === "table") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <tbody>
            {block.rows.map((row, index) => (
              <tr key={index} className="border-b border-line">
                {row.map((cell, cellIndex) => index === 0 ? <th key={cellIndex} className="py-2 pr-3 font-sans">{cell}</th> : <td key={cellIndex} className="py-2 pr-3 font-sans">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <hr className="border-line" />;
}

export function ArticleView({ article }: { article: ArticleWithAds }) {
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setConsent(Boolean(readConsent()?.marketing)), []);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const share = encodeURIComponent(url || article.slug);
  const title = encodeURIComponent(article.title);
  const middle = Math.ceil(article.content.length / 2);

  return (
    <article className="mx-auto grid max-w-7xl gap-10 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <nav className="text-sm text-muted" aria-label="Навігаційний ланцюжок">
          <Link to="/" className="hover:text-accent">Головна</Link>
          {article.categorySlug ? <> → <Link to="/category/$slug" params={{ slug: article.categorySlug }} search={{ page: 1 }} className="hover:text-accent">{article.categoryName}</Link></> : null}
          <span> → Новина</span>
        </nav>
        {article.categoryName ? <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-accent">{article.categoryName}</p> : null}
        <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">{article.title}</h1>
        <p className="mt-4 text-lg text-muted">{article.excerpt}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {article.authorSlug ? <Link to="/author/$slug" params={{ slug: article.authorSlug }} search={{ page: 1 }} className="text-ink hover:text-accent">{article.authorName}</Link> : null}
          <time>{formatWhen(article.publishedAt)}</time>
          {article.updatedAt ? <span>оновлено {formatWhen(article.updatedAt)}</span> : null}
          {article.location ? <span>{article.location}</span> : null}
        </div>
        {article.status !== "PUBLISHED" ? <p className="mt-4 border border-accent px-3 py-2 text-sm text-accent">Попередній перегляд. Матеріал ще не опубліковано.</p> : null}
        {article.coverUrl ? (
          <figure className="mt-6">
            <img src={article.coverUrl} alt={article.coverAlt || article.title} className="w-full" />
            {article.coverCaption ? <figcaption className="mt-2 text-sm text-muted">{article.coverCaption}</figcaption> : null}
          </figure>
        ) : null}
        <AdFrame code={article.ads?.top[0]?.code} allow={consent} />
        <div className="prose-news mt-6">
          {article.content.map((block, index) => (
            <div key={block.id}>
              <BlockView block={block} />
              {index + 1 === middle ? <AdFrame code={article.ads?.middle[0]?.code} allow={consent} /> : null}
            </div>
          ))}
        </div>
        {article.gallery.length > 0 ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {article.gallery.map((item) => (
              <figure key={item.url}>
                <img src={item.url} alt={item.alt} className="w-full" />
                {item.caption ? <figcaption className="mt-1 text-sm text-muted">{item.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        ) : null}
        <AdFrame code={article.ads?.bottom[0]?.code} allow={consent} />
        {article.source ? <p className="mt-6 text-sm text-muted">Джерело: {article.sourceUrl ? <a href={article.sourceUrl} className="underline">{article.source}</a> : article.source}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <Link key={tag.slug} to="/tag/$slug" params={{ slug: tag.slug }} search={{ page: 1 }} className="border border-line px-2 py-1 text-xs uppercase tracking-wide hover:border-accent">
              {tag.name}
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <a className="border border-line px-3 py-2" href={`https://t.me/share/url?url=${share}&text=${title}`}>Telegram</a>
          <a className="border border-line px-3 py-2" href={`https://www.facebook.com/sharer/sharer.php?u=${share}`}>Facebook</a>
          <a className="border border-line px-3 py-2" href={`https://twitter.com/intent/tweet?url=${share}&text=${title}`}>X</a>
          <a className="border border-line px-3 py-2" href={`viber://forward?text=${title}%20${share}`}>Viber</a>
          <button type="button" className="border border-line px-3 py-2" onClick={() => { void navigator.clipboard.writeText(window.location.href); setCopied(true); }}>
            {copied ? "Скопійовано" : "Копіювати посилання"}
          </button>
        </div>
        <section className="mt-10">
          <h2 className="font-serif text-2xl">Коментарі</h2>
          {article.comments.length === 0 ? <p className="mt-3 text-sm text-muted">Коментарів ще немає.</p> : (
            <ul className="mt-4 space-y-4">
              {article.comments.map((comment) => (
                <li key={comment.id} className="border-b border-line pb-3">
                  <p className="text-sm font-semibold">{comment.authorName}</p>
                  <p className="mt-1 text-sm">{comment.body}</p>
                  <p className="mt-1 text-xs text-muted">{formatWhen(comment.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
          <form
            className="mt-4 grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              try {
                await postComment({
                  data: {
                    articleId: article.id,
                    name: String(form.get("name") ?? ""),
                    email: String(form.get("email") ?? ""),
                    body: String(form.get("body") ?? ""),
                    company: String(form.get("company") ?? ""),
                  },
                });
                setNote("Коментар надійшов на модерацію.");
                event.currentTarget.reset();
              } catch (error) {
                setNote(error instanceof Error ? error.message : "Не вдалося надіслати");
              }
            }}
          >
            <input name="company" className="hidden" tabIndex={-1} autoComplete="off" />
            <input name="name" required placeholder="Ім'я" className="border border-line bg-card px-3 py-2" />
            <input name="email" type="email" required placeholder="Електронна пошта" className="border border-line bg-card px-3 py-2" />
            <textarea name="body" required minLength={4} rows={4} placeholder="Коментар" className="border border-line bg-card px-3 py-2" />
            <button type="submit" className="w-fit bg-ink px-4 py-2 text-sm text-paper">Надіслати</button>
            {note ? <p className="text-sm">{note}</p> : <p className="text-xs text-muted">Коментар з’явиться після перевірки редакції.</p>}
          </form>
        </section>
        {article.related.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-serif text-2xl">Читайте також</h2>
            <div className="mt-2">
              {article.related.map((item) => <CompactCard key={item.id} article={item} />)}
            </div>
          </section>
        ) : null}
      </div>
      <aside>
        <h2 className="font-serif text-2xl">Популярне</h2>
        {article.popular.map((item, index) => <CompactCard key={item.id} article={item} index={index + 1} />)}
      </aside>
    </article>
  );
}

export function articleJsonLd(article: ArticleDetail, origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: article.authorName ? { "@type": "Person", name: article.authorName } : undefined,
    image: article.coverUrl ? [article.coverUrl.startsWith("http") ? article.coverUrl : origin + article.coverUrl] : undefined,
    mainEntityOfPage: origin + "/news/" + article.slug,
  };
}
