import { createFileRoute, notFound } from "@tanstack/react-router";
import { EmptyState, NewsCard, Pager } from "@/components/site/cards";
import { SiteFrame } from "@/components/site/frame";
import { getChrome, listAuthor } from "@/lib/news/public.functions";

export const Route = createFileRoute("/author/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({ page: Math.max(1, Number(search.page) || 1) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ params, deps }) => {
    const [chrome, data] = await Promise.all([getChrome(), listAuthor({ data: { slug: params.slug, page: deps.page } })]);
    if (!data) throw notFound();
    return { chrome, data };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.data.author.name ?? "Автор"} — автор — Львів Сьогодні` },
      { name: "description", content: loaderData?.data.author.bio ?? "" },
    ],
  }),
  component: Page,
});

function Page() {
  const { chrome, data } = Route.useLoaderData();
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const letter = data.author.name.slice(0, 1);
  return (
    <SiteFrame chrome={chrome}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-start gap-4">
          <div className="grid size-16 place-items-center bg-ink font-serif text-2xl text-paper">{letter}</div>
          <div>
            <h1 className="font-serif text-4xl">{data.author.name}</h1>
            <p className="mt-2 max-w-2xl text-muted">{data.author.bio}</p>
          </div>
        </div>
        {data.items.length === 0 ? <EmptyState text="У автора ще немає опублікованих матеріалів" /> : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => <NewsCard key={item.id} article={item} />)}
          </div>
        )}
        <Pager page={data.page} pages={pages} makeHref={(page) => `/author/${data.author.slug}?page=${page}`} />
      </div>
    </SiteFrame>
  );
}
