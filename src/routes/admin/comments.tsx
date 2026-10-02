import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTitle, errText, fieldClass } from "@/components/admin/shell";
import { listComments, moderateComment } from "@/lib/news/admin.functions";
import { formatWhen } from "@/lib/news/format";

export const Route = createFileRoute("/admin/comments")({ component: Page });

const LABELS: Record<string, string> = { PENDING: "Очікує", APPROVED: "Схвалено", REJECTED: "Відхилено", SPAM: "Спам" };

function Page() {
  const [status, setStatus] = useState("PENDING");
  const [rows, setRows] = useState<{ id: string; author_name: string; author_email: string; body: string; status: string; created_at: string; title: string | null }[]>([]);
  const load = (next = status) => listComments({ data: { status: next } }).then((data) => setRows(data as typeof rows)).catch((error) => toast.error(errText(error)));
  useEffect(() => { void load(); }, []);
  return (
    <div>
      <PageTitle title="Коментарі" />
      <select className={fieldClass} value={status} onChange={(e) => { setStatus(e.target.value); void load(e.target.value); }}>
        <option value="">Усі</option>
        {Object.entries(LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="border border-line p-3 text-sm">
            <p className="font-medium">{row.author_name} · {LABELS[row.status] ?? row.status}</p>
            <p className="text-muted">{row.title} · {formatWhen(row.created_at)}</p>
            <p className="mt-2">{row.body}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => void moderateComment({ data: { id: row.id, status: "APPROVED" } }).then(() => load())}>Схвалити</button>
              <button type="button" onClick={() => void moderateComment({ data: { id: row.id, status: "REJECTED" } }).then(() => load())}>Відхилити</button>
              <button type="button" onClick={() => void moderateComment({ data: { id: row.id, status: "SPAM" } }).then(() => load())}>Спам</button>
              <button type="button" onClick={() => void moderateComment({ data: { id: row.id, status: "DELETE" } }).then(() => load())}>Видалити</button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="mt-4 text-muted">Коментарів немає</p> : null}
    </div>
  );
}
