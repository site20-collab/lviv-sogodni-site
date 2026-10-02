import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTitle, errText, fieldClass } from "@/components/admin/shell";
import { deleteTag, listTags, saveTag } from "@/lib/news/admin.functions";

export const Route = createFileRoute("/admin/tags")({ component: Page });

function Page() {
  const [rows, setRows] = useState<{ id: string; name: string; slug: string; description: string }[]>([]);
  const [form, setForm] = useState({ id: "", name: "", slug: "", description: "" });
  const load = () => listTags().then(setRows).catch((error) => toast.error(errText(error)));
  useEffect(() => { void load(); }, []);
  return (
    <div>
      <PageTitle title="Теги" />
      <form className="grid gap-2 md:grid-cols-3" onSubmit={async (event) => { event.preventDefault(); await saveTag({ data: form }); setForm({ id: "", name: "", slug: "", description: "" }); await load(); }}>
        <input className={fieldClass} placeholder="Назва" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={fieldClass} placeholder="Адреса" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input className={fieldClass} placeholder="Опис" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button className="bg-accent px-3 py-2 text-sm text-accent-ink" type="submit">Зберегти</button>
      </form>
      <ul className="mt-6 divide-y divide-line border border-line">
        {rows.map((row) => (
          <li key={row.id} className="flex justify-between px-3 py-2 text-sm">
            <button type="button" onClick={() => setForm(row)}>{row.name}</button>
            <button type="button" onClick={async () => { if (!confirm("Видалити тег?")) return; await deleteTag({ data: { id: row.id } }); await load(); }}>Видалити</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
