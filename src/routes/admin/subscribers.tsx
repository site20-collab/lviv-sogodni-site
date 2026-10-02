import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageTitle } from "@/components/admin/shell";
import { listSubscribers, updateSubscriber } from "@/lib/news/admin.functions";
import { formatWhen } from "@/lib/news/format";

export const Route = createFileRoute("/admin/subscribers")({ component: Page });

function Page() {
  const [rows, setRows] = useState<{ id: string; email: string; active: boolean; created_at: string }[]>([]);
  const load = () => listSubscribers().then((data) => setRows(data as typeof rows));
  useEffect(() => { void load(); }, []);
  return (
    <div>
      <PageTitle title="Підписники" />
      <p className="mb-4 text-sm text-muted">Адреси зберігаються локально. Зовнішній сервіс розсилки можна підключити пізніше до цієї таблиці.</p>
      {rows.length === 0 ? <p className="text-muted">Підписників ще немає</p> : null}
      <ul className="divide-y divide-line border border-line">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
            <span>{row.email} · {row.active ? "активний" : "вимкнений"} · {formatWhen(row.created_at)}</span>
            <span className="flex gap-3">
              <button type="button" onClick={() => void updateSubscriber({ data: { id: row.id, action: "toggle" } }).then(load)}>{row.active ? "Вимкнути" : "Увімкнути"}</button>
              <button type="button" onClick={() => void updateSubscriber({ data: { id: row.id, action: "delete" } }).then(load)}>Видалити</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
