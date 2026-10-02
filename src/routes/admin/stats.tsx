import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageTitle, errText } from "@/components/admin/shell";
import { getStats } from "@/lib/news/admin.functions";

export const Route = createFileRoute("/admin/stats")({ component: Page });

const PERIODS = [
  ["24h", "24 години"],
  ["7d", "7 днів"],
  ["30d", "30 днів"],
  ["90d", "90 днів"],
  ["365d", "Рік"],
] as const;

function Page() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number][0]>("30d");
  const [data, setData] = useState<Awaited<ReturnType<typeof getStats>> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getStats({ data: { period } }).then(setData).catch((err) => setError(errText(err)));
  }, [period]);
  return (
    <div>
      <PageTitle title="Статистика" />
      <div className="flex flex-wrap gap-2">
        {PERIODS.map(([id, label]) => (
          <button key={id} type="button" className={`border px-3 py-2 text-sm ${period === id ? "border-accent text-accent" : "border-line"}`} onClick={() => setPeriod(id)}>{label}</button>
        ))}
      </div>
      {error ? <p className="mt-4 text-accent">{error}</p> : null}
      {!data ? <p className="mt-4 text-muted">Завантаження…</p> : (
        <>
          <p className="mt-4 text-sm text-muted">Сьогодні: {data.todayViews}. Учора: {data.yesterdayViews}. У періоді: {data.views?.views ?? 0} візитів, {data.views?.visitors ?? 0} сесій. Частина точок — демонстраційний архів ({data.views?.seed ?? 0}), решта з’являється після згоди на аналітику.</p>
          <div className="mt-4 h-64 border border-line bg-card p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series}>
                <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} width={32} />
                <Tooltip />
                <Area dataKey="views" name="Перегляди" stroke="#0b4f9c" fill="#0b4f9c" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-2xl">Пристрої</h2>
              <ul className="mt-2 text-sm">{data.devices.map((item) => <li key={item.name} className="flex justify-between border-b border-line py-1"><span>{item.name}</span><span className="tabular-nums">{item.n}</span></li>)}</ul>
            </div>
            <div>
              <h2 className="font-serif text-2xl">Джерела</h2>
              <ul className="mt-2 text-sm">{data.sources.map((item) => <li key={item.name} className="flex justify-between border-b border-line py-1"><span className="truncate">{item.name}</span><span className="tabular-nums">{item.n}</span></li>)}</ul>
            </div>
          </div>
          <h2 className="mt-6 font-serif text-2xl">Топ матеріалів</h2>
          <ul className="mt-2 text-sm">{data.top.map((item) => <li key={item.slug} className="flex justify-between border-b border-line py-1"><a href={`/news/${item.slug}`}>{item.title}</a><span className="tabular-nums">{item.views}</span></li>)}</ul>
        </>
      )}
    </div>
  );
}
