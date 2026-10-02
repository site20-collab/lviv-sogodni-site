import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageTitle } from "@/components/admin/shell";
import { adminListArticles, getStats } from "@/lib/news/admin.functions";

export const Route = createFileRoute("/admin/seo")({ component: Page });

function Page() {
  const [missing, setMissing] = useState(0);
  const [rows, setRows] = useState<{ id: string; title: string; slug: string }[]>([]);
  useEffect(() => {
    void getStats({ data: { period: "7d" } }).then((data) => setMissing(data.missingSeo));
    void adminListArticles({ data: { page: 1, status: "PUBLISHED" } }).then((data) => setRows(data.items.slice(0, 12)));
  }, []);
  return (
    <div>
      <PageTitle title="SEO" />
      <p className="text-sm">Опублікованих без SEO-опису: <strong className="tabular-nums">{missing}</strong>. Карта сайту, RSS і robots генеруються автоматично.</p>
      <ul className="mt-4 space-y-2 text-sm">
        <li><a className="text-accent" href="/sitemap.xml">/sitemap.xml</a></li>
        <li><a className="text-accent" href="/rss.xml">/rss.xml</a></li>
        <li><a className="text-accent" href="/robots.txt">/robots.txt</a></li>
      </ul>
      <h2 className="mt-6 font-serif text-2xl">Опубліковані матеріали</h2>
      <ul className="mt-2 divide-y divide-line border border-line">
        {rows.map((row) => (
          <li key={row.id} className="flex justify-between px-3 py-2 text-sm">
            <span>{row.title}</span>
            <Link to="/admin/news/$id" params={{ id: row.id }} className="text-accent">SEO</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
