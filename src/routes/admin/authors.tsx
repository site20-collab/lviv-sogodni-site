import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTitle, errText, fieldClass } from "@/components/admin/shell";
import { deleteAuthor, listAuthors, saveAuthor } from "@/lib/news/admin.functions";

export const Route = createFileRoute("/admin/authors")({ component: Page });

function Page() {
  const [rows, setRows] = useState<{ id: string; name: string; slug: string; email: string | null; bio: string; avatar_url: string | null; active: boolean }[]>([]);
  const [form, setForm] = useState({ id: "", name: "", slug: "", email: "", bio: "", avatarUrl: "", active: true });
  const load = () => listAuthors().then((data) => setRows(data as typeof rows)).catch((error) => toast.error(errText(error)));
  useEffect(() => { void load(); }, []);
  return (
    <div>
      <PageTitle title="Автори" />
      <form className="grid gap-2" onSubmit={async (event) => { event.preventDefault(); await saveAuthor({ data: form }); setForm({ id: "", name: "", slug: "", email: "", bio: "", avatarUrl: "", active: true }); await load(); }}>
        <input className={fieldClass} placeholder="Ім'я" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={fieldClass} placeholder="Адреса сторінки" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input className={fieldClass} placeholder="Пошта" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <textarea className={fieldClass} placeholder="Біографія" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        <label className="text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Активний</label>
        <button className="w-fit bg-accent px-3 py-2 text-sm text-accent-ink" type="submit">Зберегти</button>
      </form>
      <ul className="mt-6 divide-y divide-line border border-line">
        {rows.map((row) => (
          <li key={row.id} className="flex justify-between gap-3 px-3 py-2 text-sm">
            <button type="button" className="text-left" onClick={() => setForm({ id: row.id, name: row.name, slug: row.slug, email: row.email ?? "", bio: row.bio, avatarUrl: row.avatar_url ?? "", active: row.active })}>
              <span className="font-medium">{row.name}</span>
              <span className="mt-1 block text-muted">{row.bio}</span>
            </button>
            <button type="button" onClick={async () => { if (!confirm("Видалити автора?")) return; await deleteAuthor({ data: { id: row.id } }); await load(); }}>Видалити</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
