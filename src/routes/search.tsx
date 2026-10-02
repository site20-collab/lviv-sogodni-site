import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EmptyState, NewsCard, Pager } from "@/components/site/cards";
import { SiteFrame } from "@/components/site/frame";
import { getChrome, searchNews } from "@/lib/news/public.functions";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    page: Math.max(1, Number(search.page) || 1),
    sort: search.sort === "newest" ? "newest" : "relevance",
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [chrome, data] = await Promise.all([getChrome(), searchNews({ data: deps })]);
    return { chrome, data };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.data.q ? `Пошук: ${loaderData.data.q}` : "Пошук — Львів Сьогодні" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  const { chrome, data } = Route.useLoaderData();
  const [q, setQ] = useState(data.q);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <SiteFrame chrome={chrome}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="font-serif text-4xl">Пошук</h1>
        <form className="mt-4 flex max-w-xl" action="/search">
          <input name="q" value={q} onChange={(event) => setQ(event.target.value)} className="w-full border border-line bg-card px-3 py-3" placeholder="Заголовок, текст, тег" />
          <button className="bg-ink px-4 text-sm text-paper" type="submit">Знайти</button>
        </form>
        <div className="mt-3 flex gap-3 text-sm">
          <a href={`/search?q=${encodeURIComponent(data.q)}&sort=relevance`} className={data.sort === "relevance" ? "text-accent" : ""}>За релевантністю</a>
          <a href={`/search?q=${encodeURIComponent(data.q)}&sort=newest`} className={data.sort === "newest" ? "text-accent" : ""}>Спочатку нові</a>
        </div>
        <p className="mt-4 text-sm text-muted">{data.q.length < 2 ? "Введіть щонайменше два символи" : `${data.total} результатів`}</p>
        {data.items.length === 0 && data.q.length >= 2 ? <EmptyState text="Нічого не знайдено" /> : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => <NewsCard key={item.id} article={item} />)}
          </div>
        )}
        <Pager page={data.page} pages={pages} makeHref={(page) => `/search?q=${encodeURIComponent(data.q)}&sort=${data.sort}&page=${page}`} />
      </div>
    </SiteFrame>
  );
}
