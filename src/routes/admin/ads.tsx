import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTitle, errText, fieldClass } from "@/components/admin/shell";
import { PLACEMENTS } from "@/lib/news/constants";
import { deleteAd, listAds, saveAd } from "@/lib/news/admin.functions";

export const Route = createFileRoute("/admin/ads")({ component: Page });

function Page() {
  const [rows, setRows] = useState<{ id: string; name: string; code: string; placement: string; active: boolean; start_date: string | null; end_date: string | null }[]>([]);
  const [form, setForm] = useState({ id: "", name: "", code: "", placement: "homepage", active: true, startDate: "", endDate: "" });
  const load = () => listAds().then((data) => setRows(data as typeof rows)).catch((error) => toast.error(errText(error)));
  useEffect(() => { void load(); }, []);
  return (
    <div>
      <PageTitle title="Реклама" />
      <p className="mb-3 text-sm text-muted">Код виконується в ізольованій рамці і лише якщо читач погодився на маркетингові cookie.</p>
      <form className="grid gap-2" onSubmit={async (event) => { event.preventDefault(); await saveAd({ data: form }); setForm({ id: "", name: "", code: "", placement: "homepage", active: true, startDate: "", endDate: "" }); await load(); }}>
        <input className={fieldClass} placeholder="Назва" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className={fieldClass} value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })}>
          {PLACEMENTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <textarea className={fieldClass} rows={5} placeholder="HTML" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={fieldClass} type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <input className={fieldClass} type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        </div>
        <label className="text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Активний</label>
        <button className="w-fit bg-accent px-3 py-2 text-sm text-accent-ink" type="submit">Зберегти</button>
      </form>
      <ul className="mt-6 space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="border border-line p-3 text-sm">
            <p className="font-medium">{row.name} · {row.placement} · {row.active ? "увімкнено" : "вимкнено"}</p>
            <div className="mt-2 flex gap-3">
              <button type="button" onClick={() => setForm({ id: row.id, name: row.name, code: row.code, placement: row.placement, active: row.active, startDate: row.start_date ?? "", endDate: row.end_date ?? "" })}>Правити</button>
              <button type="button" onClick={async () => { await deleteAd({ data: { id: row.id } }); await load(); }}>Видалити</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
