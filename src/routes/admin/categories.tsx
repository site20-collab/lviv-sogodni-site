import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTitle, errText, fieldClass } from "@/components/admin/shell";
import { deleteCategory, listCategories, saveCategory } from "@/lib/news/admin.functions";

export const Route = createFileRoute("/admin/categories")({ component: Page });

type Row = { id: string; name: string; slug: string; description: string; seo_title: string | null; seo_description: string | null; sort_order: number; active: boolean; show_in_nav: boolean };

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({ id: "", name: "", slug: "", description: "", seoTitle: "", seoDescription: "", sortOrder: 0, active: true, showInNav: false });
  const load = () => listCategories().then((data) => setRows(data as Row[])).catch((error) => toast.error(errText(error)));
  useEffect(() => { void load(); }, []);
  return (
    <div>
      <PageTitle title="Рубрики" />
      <form className="grid gap-2 md:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); await saveCategory({ data: form }); toast.success("Збережено"); setForm({ id: "", name: "", slug: "", description: "", seoTitle: "", seoDescription: "", sortOrder: 0, active: true, showInNav: false }); await load(); }}>
        <input className={fieldClass} placeholder="Назва" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className={fieldClass} placeholder="Адреса" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <textarea className={fieldClass} placeholder="Опис" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <textarea className={fieldClass} placeholder="SEO description" value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} />
        <input className={fieldClass} placeholder="SEO title" value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} />
        <input className={fieldClass} type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
        <label className="text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Активна</label>
        <label className="text-sm"><input type="checkbox" checked={form.showInNav} onChange={(e) => setForm({ ...form, showInNav: e.target.checked })} /> У меню сайту (через розділ «Меню»)</label>
        <button className="bg-accent px-3 py-2 text-sm text-accent-ink" type="submit">{form.id ? "Оновити" : "Створити"}</button>
      </form>
      <ul className="mt-6 divide-y divide-line border border-line">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
            <span>{row.name} <span className="text-muted">/{row.slug}</span></span>
            <span className="flex gap-3">
              <button type="button" onClick={() => setForm({ id: row.id, name: row.name, slug: row.slug, description: row.description, seoTitle: row.seo_title ?? "", seoDescription: row.seo_description ?? "", sortOrder: row.sort_order, active: row.active, showInNav: row.show_in_nav })}>Правити</button>
              <button type="button" onClick={async () => { if (!confirm("Видалити рубрику?")) return; await deleteCategory({ data: { id: row.id } }); await load(); }}>Видалити</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
