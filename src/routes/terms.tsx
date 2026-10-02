import { createFileRoute } from "@tanstack/react-router";
import { SiteFrame } from "@/components/site/frame";
import { getChrome, getLegalPage } from "@/lib/news/public.functions";

export const Route = createFileRoute("/terms")({
  loader: async () => ({ chrome: await getChrome(), page: await getLegalPage({ data: { key: "terms" } }) }),
  head: () => ({ meta: [{ title: "Правила — Львів Сьогодні" }] }),
  component: () => {
    const { chrome, page } = Route.useLoaderData();
    return <SiteFrame chrome={chrome}><article className="mx-auto max-w-3xl px-4 py-10"><h1 className="font-serif text-4xl">Правила використання</h1>{page.body.split("\n\n").map((p) => <p key={p.slice(0, 20)} className="mt-4 leading-relaxed">{p}</p>)}</article></SiteFrame>;
  },
});
