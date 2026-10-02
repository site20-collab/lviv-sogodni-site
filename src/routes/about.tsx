import { createFileRoute } from "@tanstack/react-router";
import { SiteFrame } from "@/components/site/frame";
import { getChrome, getLegalPage } from "@/lib/news/public.functions";

export const Route = createFileRoute("/about")({
  loader: async () => {
    const [chrome, page] = await Promise.all([getChrome(), getLegalPage({ data: { key: "about" } })]);
    return { chrome, page };
  },
  head: () => ({ meta: [{ title: "Про нас — Львів Сьогодні" }] }),
  component: () => {
    const { chrome, page } = Route.useLoaderData();
    return (
      <SiteFrame chrome={chrome}>
        <article className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="font-serif text-4xl">Про нас</h1>
          {page.body.split("\n\n").map((paragraph) => <p key={paragraph.slice(0, 24)} className="mt-4 text-lg leading-relaxed">{paragraph}</p>)}
        </article>
      </SiteFrame>
    );
  },
});
