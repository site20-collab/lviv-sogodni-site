import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTitle, errText, fieldClass } from "@/components/admin/shell";
import { adminListArticles, adminRefs, bulkArticles, deleteArticle, duplicateArticle, setArticleStatus } from "@/lib/news/admin.functions";
import { STATUS_LABEL, formatWhen } from "@/lib/news/format";

export const Route = createFileRoute("/admin/news/")({ component: NewsList });

function NewsList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof adminListArticles>> | null>(null);
  const [refs, setRefs] = useState<Awaited<ReturnType<typeof adminRefs>> | null>(null);

  async function load(nextPage = page) {
    try {
      const data = await adminListArticles({ data: { q, status, categoryId, authorId, page: nextPage } });
      setRows(data);
      setPage(nextPage);
    } catch (error) {
      toast.error(errText(error));
    }
  }
  useEffect(() => {
    adminRefs().then(setRefs).catch(() => undefined);
    void load(1);
  }, []);

  const pages = rows ? Math.max(1, Math.ceil(rows.total / rows.pageSize)) : 1;
  return (
    <div>
      <PageTitle title="Новини" action={<Link to="/admin/news/create" className="bg-accent px-3 py-2 text-sm text-accent-ink">Створити</Link>} />
      <div className="grid gap-2 md:grid-cols-4">
        <input className={fieldClass} placeholder="Пошук" value={q} onChange={(event) => setQ(event.target.value)} />
        <select className={fieldClass} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Усі статуси</option>
          {Object.entries(STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <select className={fieldClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Усі рубрики</option>
          {refs?.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className={fieldClass} value={authorId} onChange={(event) => setAuthorId(event.target.value)}>
          <option value="">Усі автори</option>
          {refs?.authors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <button type="button" className="mt-2 border border-line px-3 py-2 text-sm" onClick={() => void load(1)}>Застосувати</button>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={() => void act("publish")}>Опублікувати вибране</button>
        <button type="button" onClick={() => void act("unpublish")}>Зняти з публікації</button>
        <button type="button" onClick={() => void act("archive")}>В архів</button>
        <button type="button" onClick={() => void act("delete")}>Видалити</button>
      </div>
      {!rows ? <p className="mt-6 text-muted">Завантаження…</p> : rows.items.length === 0 ? <p className="mt-6 text-muted">Нічого не знайдено</p> : (
        <div className="mt-4 overflow-x-auto border border-line">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-card text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="p-2"></th>
                <th className="p-2">Матеріал</th>
                <th className="p-2">Рубрика</th>
                <th className="p-2">Автор</th>
                <th className="p-2">Статус</th>
                <th className="p-2">Перегляди</th>
                <th className="p-2">Оновлено</th>
                <th className="p-2">Дії</th>
              </tr>
            </thead>
            <tbody>
              {rows.items.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="p-2"><input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} /></td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      {item.coverUrl ? <img src={item.coverUrl} alt="" className="size-12 object-cover" /> : <div className="size-12 bg-line" />}
                      <Link to="/admin/news/$id" params={{ id: item.id }} className="font-medium hover:text-accent">{item.title}</Link>
                    </div>
                  </td>
                  <td className="p-2">{item.categoryName}</td>
                  <td className="p-2">{item.authorName}</td>
                  <td className="p-2">{STATUS_LABEL[item.status]}</td>
                  <td className="p-2 tabular-nums">{item.viewCount}</td>
                  <td className="p-2">{formatWhen(item.updatedAt)}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      <Link to="/admin/news/$id" params={{ id: item.id }}>Правити</Link>
                      <button type="button" onClick={() => void duplicateArticle({ data: { id: item.id } }).then(() => load())}>Копія</button>
                      <a href={`/news/${item.slug}`} target="_blank" rel="noreferrer">Сайт</a>
                      {item.status === "PUBLISHED" ? <button type="button" onClick={() => void setArticleStatus({ data: { id: item.id, status: "DRAFT" } }).then(() => load())}>Зняти</button> : <button type="button" onClick={() => void setArticleStatus({ data: { id: item.id, status: "PUBLISHED" } }).then(() => load())}>Опублікувати</button>}
                      <button type="button" onClick={() => void setArticleStatus({ data: { id: item.id, status: "ARCHIVED" } }).then(() => load())}>Архів</button>
                      <button type="button" onClick={() => { if (confirm("Видалити матеріал?")) void deleteArticle({ data: { id: item.id } }).then(() => load()); }}>Видалити</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => void load(page - 1)}>Назад</button>
        <span className="text-sm tabular-nums">{page} / {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => void load(page + 1)}>Далі</button>
      </div>
    </div>
  );

  async function act(action: string) {
    if (selected.length === 0) return;
    if (action === "delete" && !confirm("Видалити вибрані матеріали?")) return;
    await bulkArticles({ data: { ids: selected, action } });
    setSelected([]);
    await load();
  }
}
