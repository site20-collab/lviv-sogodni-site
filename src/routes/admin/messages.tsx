import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageTitle } from "@/components/admin/shell";
import { listMessages, updateMessage } from "@/lib/news/admin.functions";
import { formatWhen } from "@/lib/news/format";

export const Route = createFileRoute("/admin/messages")({ component: Page });

function Page() {
  const [rows, setRows] = useState<{ id: string; name: string; email: string; message: string; is_read: boolean; created_at: string }[]>([]);
  const load = () => listMessages().then((data) => setRows(data as typeof rows));
  useEffect(() => { void load(); }, []);
  return (
    <div>
      <PageTitle title="Повідомлення" />
      {rows.length === 0 ? <p className="text-muted">Звернень ще немає</p> : null}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="border border-line p-3 text-sm">
            <p className="font-medium">{row.name} · {row.email} {!row.is_read ? <span className="text-accent">нове</span> : null}</p>
            <p className="text-muted">{formatWhen(row.created_at)}</p>
            <p className="mt-2 whitespace-pre-wrap">{row.message}</p>
            <div className="mt-2 flex gap-3">
              <button type="button" onClick={() => void updateMessage({ data: { id: row.id, action: "read" } }).then(load)}>Прочитано</button>
              <button type="button" onClick={() => void updateMessage({ data: { id: row.id, action: "delete" } }).then(load)}>Видалити</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
