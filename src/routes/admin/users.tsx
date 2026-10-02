import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTitle, errText, fieldClass } from "@/components/admin/shell";
import { deleteUser, listUsers, saveUser } from "@/lib/news/admin.functions";
import { ROLE_LABEL } from "@/lib/news/format";
import { ROLES } from "@/lib/news/types";

export const Route = createFileRoute("/admin/users")({ component: Page });

function Page() {
  const [rows, setRows] = useState<{ user_id: string; role: string; display_name: string | null; email: string; name: string }[]>([]);
  const [form, setForm] = useState({ userId: "", name: "", email: "", password: "", role: "EDITOR" });
  const load = () => listUsers().then(setRows).catch((error) => toast.error(errText(error)));
  useEffect(() => { void load(); }, []);
  return (
    <div>
      <PageTitle title="Користувачі" />
      <form className="grid gap-2 md:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault();
        try {
          await saveUser({ data: form });
          toast.success("Збережено");
          setForm({ userId: "", name: "", email: "", password: "", role: "EDITOR" });
          await load();
        } catch (error) { toast.error(errText(error)); }
      }}>
        <input className={fieldClass} placeholder="Ім'я" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className={fieldClass} placeholder="Пошта" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={Boolean(form.userId)} />
        <input className={fieldClass} placeholder={form.userId ? "Новий пароль, якщо треба" : "Пароль від 10 символів"} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select className={fieldClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}
        </select>
        <button className="bg-accent px-3 py-2 text-sm text-accent-ink" type="submit">{form.userId ? "Оновити" : "Створити"}</button>
      </form>
      <ul className="mt-6 divide-y divide-line border border-line">
        {rows.map((row) => (
          <li key={row.user_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
            <span>{row.display_name || row.name} · {row.email} · {ROLE_LABEL[row.role]}</span>
            <span className="flex gap-3">
              <button type="button" onClick={() => setForm({ userId: row.user_id, name: row.display_name || row.name, email: row.email, password: "", role: row.role })}>Правити</button>
              <button type="button" onClick={async () => { if (!confirm("Видалити користувача?")) return; await deleteUser({ data: { userId: row.user_id } }); await load(); }}>Видалити</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
