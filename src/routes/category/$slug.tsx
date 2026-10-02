import { createFileRoute, notFound } from "@tanstack/react-router";
import { EmptyState, NewsCard, Pager } from "@/components/site/cards";
import { SiteFrame } from "@/components/site/frame";
import { getChrome, listCategory } from "@/lib/news/public.functions";

export const Route = createFileRoute("/category/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({ page: Math.max(1, Number(search.page) || 1) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ params, deps }) => {
    const [chrome, data] = await Promise.all([getChrome(), listCategory({ data: { slug: params.slug, page: deps.page } })]);
    if (!data) throw notFound();
    return { chrome, data };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.data.category.seoTitle || loaderData?.data.category.name || "Рубрика"} — Львів Сьогодні` },
      { name: "description", content: loaderData?.data.category.seoDescription || loaderData?.data.category.description || "" },
    ],
  }),
  component: Page,
});

function Page() {
  const { chrome, data } = Route.useLoaderData();
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <SiteFrame chrome={chrome}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-xs uppercase tracking-widest text-accent">Рубрика</p>
        <h1 className="mt-2 font-serif text-4xl">{data.category.name}</h1>
        <p className="mt-2 max-w-2xl text-muted">{data.category.description}</p>
        {data.items.length === 0 ? <EmptyState text="У цій рубриці поки немає новин" /> : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => <NewsCard key={item.id} article={item} />)}
          </div>
        )}
        <Pager page={data.page} pages={pages} makeHref={(page) => `/category/${data.category.slug}?page=${page}`} />
      </div>
    </SiteFrame>
  );
}
