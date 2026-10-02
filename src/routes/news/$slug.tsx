import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArticleView, articleJsonLd } from "@/components/site/article";
import { SiteFrame } from "@/components/site/frame";
import { readConsent } from "@/components/site/consent";
import { getArticle, getChrome, trackView } from "@/lib/news/public.functions";

export const Route = createFileRoute("/news/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({ preview: typeof search.preview === "string" ? search.preview : "" }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const [chrome, article] = await Promise.all([
      getChrome(),
      getArticle({ data: { slug: params.slug, preview: deps.preview } }),
    ]);
    if (!article) throw notFound();
    return { chrome, article };
  },
  head: ({ loaderData }) => {
    const article = loaderData?.article;
    if (!article) return { meta: [{ title: "Львів Сьогодні" }] };
    const title = article.seoTitle || article.title;
    const description = article.seoDescription || article.excerpt;
    return {
      meta: [
        { title: `${title} — Львів Сьогодні` },
        { name: "description", content: description },
        ...(article.noIndex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
      ],
      links: article.canonicalUrl ? [{ rel: "canonical", href: article.canonicalUrl }] : [],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(articleJsonLd(article, "")) },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Головна", item: "/" },
              { "@type": "ListItem", position: 2, name: article.categoryName || "Новини", item: article.categorySlug ? `/category/${article.categorySlug}` : "/news" },
              { "@type": "ListItem", position: 3, name: article.title },
            ],
          }),
        },
      ],
    };
  },
  component: Page,
});

function Page() {
  const { chrome, article } = Route.useLoaderData();
  useEffect(() => {
    const consent = readConsent();
    if (!consent?.analytics || article.status !== "PUBLISHED") return;
    const key = "ls-sid";
    let sessionId = localStorage.getItem(key);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem(key, sessionId);
    }
    const ua = navigator.userAgent;
    const device = /Mobi|Android/i.test(ua) ? "mobile" : /Tablet|iPad/i.test(ua) ? "tablet" : "desktop";
    const browser = /Firefox/i.test(ua) ? "Firefox" : /Edg/i.test(ua) ? "Edge" : /Chrome/i.test(ua) ? "Chrome" : /Safari/i.test(ua) ? "Safari" : "інший";
    const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Mac/i.test(ua) ? "macOS" : /Windows/i.test(ua) ? "Windows" : "інша";
    void trackView({
      data: { path: `/news/${article.slug}`, articleId: article.id, sessionId, referrer: document.referrer, device, browser, os },
    });
  }, [article.id, article.slug, article.status]);
  return (
    <SiteFrame chrome={chrome}>
      <ArticleView article={article} />
    </SiteFrame>
  );
}
