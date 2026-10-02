import { createFileRoute } from "@tanstack/react-router";
import { CompactCard, HeroCard, SectionBlock, SideCard } from "@/components/site/cards";
import { AdFrame, readConsent } from "@/components/site/consent";
import { Newsletter, SiteFrame } from "@/components/site/frame";
import { getChrome, getHomepage } from "@/lib/news/public.functions";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [chrome, home] = await Promise.all([getChrome(), getHomepage()]);
    return { chrome, home };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.chrome.settings.seoTitle ?? "Львів Сьогодні" },
      { name: "description", content: loaderData?.chrome.settings.seoDescription ?? "Новини Львова та області" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: loaderData?.chrome.settings.siteName ?? "Львів Сьогодні",
          description: loaderData?.chrome.settings.description ?? "",
          potentialAction: { "@type": "SearchAction", target: "/search?q={query}", "query-input": "required name=query" },
        }),
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { chrome, home } = Route.useLoaderData();
  const [marketing, setMarketing] = useState(false);
  useEffect(() => setMarketing(Boolean(readConsent()?.marketing)), []);
  return (
    <SiteFrame chrome={chrome}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        {home.hero ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
            <HeroCard article={home.hero} />
            <div>
              {home.side.map((item) => <SideCard key={item.id} article={item} />)}
            </div>
          </div>
        ) : <p className="text-muted">Новин поки немає.</p>}
        <AdFrame code={home.ads[0]?.code} allow={marketing} />
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            {home.sections.filter((section) => section.title !== "Популярне").map((section) => (
              <SectionBlock key={section.id} title={section.title} href={section.href} items={section.items} />
            ))}
          </div>
          <aside>
            <h2 className="border-b border-ink pb-2 font-serif text-3xl">Популярне</h2>
            {home.popular.map((item, index) => <CompactCard key={item.id} article={item} index={index + 1} />)}
          </aside>
        </div>
      </div>
      <Newsletter />
    </SiteFrame>
  );
}
