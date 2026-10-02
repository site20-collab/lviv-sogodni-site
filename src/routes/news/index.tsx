import { createFileRoute } from "@tanstack/react-router";
import { NewsCard, Pager, EmptyState } from "@/components/site/cards";
import { SiteFrame } from "@/components/site/frame";
import { getChrome, listNews } from "@/lib/news/public.functions";

export const Route = createFileRoute("/news/")({
  validateSearch: (search: Record<string, unknown>) => ({ page: Math.max(1, Number(search.page) || 1) }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [chrome, data] = await Promise.all([getChrome(), listNews({ data: deps })]);
    return { chrome, data };
  },
  head: () => ({ meta: [{ title: "Усі новини — Львів Сьогодні" }, { name: "description", content: "Стрічка новин Львова та області." }] }),
  component: Page,
});

function Page() {
  const { chrome, data } = Route.useLoaderData();
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <SiteFrame chrome={chrome}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="font-serif text-4xl">Усі новини</h1>
        <p className="mt-2 text-sm text-muted">{data.total} матеріалів</p>
        {data.items.length === 0 ? <EmptyState text="Новин поки немає" /> : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => <NewsCard key={item.id} article={item} />)}
          </div>
        )}
        <Pager page={data.page} pages={pages} makeHref={(page) => `/news?page=${page}`} />
      </div>
    </SiteFrame>
  );
}
