import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { prepareFile } from "@/components/admin/editor";
import { PageTitle, errText, fieldClass } from "@/components/admin/shell";
import { deleteMedia, listMedia, updateMedia } from "@/lib/news/admin.functions";

export const Route = createFileRoute("/admin/media")({ component: Page });

type Item = { id: string; original_name: string; mime: string; size: number; alt: string; caption: string; width: number | null; height: number | null };

function Page() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Item[]>([]);
  const [alt, setAlt] = useState("");
  const load = (query = q) => listMedia({ data: { q: query } }).then((data) => setRows(data as Item[])).catch((error) => toast.error(errText(error)));
  useEffect(() => { void load(""); }, []);
  return (
    <div>
      <PageTitle title="Медіатека" />
      <div className="flex flex-wrap gap-2">
        <input className={fieldClass} placeholder="Пошук за назвою або alt" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="border border-line px-3" onClick={() => void load()}>Знайти</button>
      </div>
      <label className="mt-4 block border border-dashed border-line p-6 text-sm">
        Перетягніть або оберіть файл. Alt обов'язковий.
        <input className={`${fieldClass} mt-2`} placeholder="Alt для нового фото" value={alt} onChange={(e) => setAlt(e.target.value)} />
        <input className="mt-2 block" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (!alt.trim()) return toast.error("Спочатку вкажіть alt");
          try {
            await prepareFile(file, alt.trim());
            toast.success("Завантажено");
            setAlt("");
            await load();
          } catch (error) {
            toast.error(errText(error));
          }
        }} />
      </label>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((item) => (
          <figure key={item.id} className="border border-line bg-card p-2">
            <img src={`/api/media/${item.id}`} alt={item.alt} className="aspect-video w-full object-cover" />
            <figcaption className="mt-2 text-xs text-muted">{item.original_name} · {Math.round(item.size / 1024)} КБ · {item.width}×{item.height}</figcaption>
            <input className={`${fieldClass} mt-2`} defaultValue={item.alt} onBlur={(e) => void updateMedia({ data: { id: item.id, alt: e.target.value, caption: item.caption } })} />
            <div className="mt-2 flex gap-2 text-sm">
              <button type="button" onClick={() => void navigator.clipboard.writeText(`${location.origin}/api/media/${item.id}`)}>Копіювати URL</button>
              <button type="button" onClick={async () => { if (!confirm("Видалити файл?")) return; await deleteMedia({ data: { id: item.id } }); await load(); }}>Видалити</button>
            </div>
          </figure>
        ))}
      </div>
      {rows.length === 0 ? <p className="mt-4 text-muted">Файлів ще немає. Обкладинки демо лежать у бібліотеці фото матеріалу.</p> : null}
    </div>
  );
}
