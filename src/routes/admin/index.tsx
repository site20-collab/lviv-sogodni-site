import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageTitle, errText } from "@/components/admin/shell";
import { getDashboard } from "@/lib/news/admin.functions";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboard>> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getDashboard().then(setData).catch((err) => setError(errText(err)));
  }, []);
  if (error) return <p className="text-accent">{error}</p>;
  if (!data) return <p className="text-muted">Завантаження панелі…</p>;
  const cards = [
    ["Матеріалів", data.counts?.total ?? 0],
    ["Сьогодні опубліковано", data.counts?.today ?? 0],
    ["Чернетки", data.counts?.drafts ?? 0],
    ["Заплановані", data.counts?.scheduled ?? 0],
    ["На модерації", data.counts?.pending ?? 0],
    ["Візити за 7 днів", data.views?.views ?? 0],
    ["Унікальні сесії", data.views?.visitors ?? 0],
  ];
  return (
    <div>
      <PageTitle title="Панель" action={<Link to="/admin/news/create" className="bg-accent px-3 py-2 text-sm text-accent-ink">Нова новина</Link>} />
      <p className="mb-4 border border-line bg-card px-3 py-2 text-sm">Графіки за тиждень містять архів візитів і живі перегляди після згоди на аналітику.</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="border border-line bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-2 font-serif text-3xl tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-8 font-serif text-2xl">Популярні матеріали</h2>
      <ul className="mt-3 divide-y divide-line border border-line">
        {data.top.map((item) => (
          <li key={item.slug} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <a href={`/news/${item.slug}`} className="hover:text-accent">{item.title}</a>
            <span className="tabular-nums text-muted">{item.views}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm"><Link to="/admin/stats" className="text-accent">Повна статистика</Link></p>
    </div>
  );
}
