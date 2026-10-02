import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTitle, errText, fieldClass } from "@/components/admin/shell";
import { getSettingsAdmin, saveHomepage } from "@/lib/news/admin.functions";

export const Route = createFileRoute("/admin/homepage")({ component: Page });

type Section = { id: string; title: string; category_slug: string | null; article_count: number; active: boolean; section_key: string };

function Page() {
  const [sections, setSections] = useState<Section[]>([]);
  useEffect(() => { getSettingsAdmin().then((data) => setSections(data.sections as Section[])).catch((error) => toast.error(errText(error))); }, []);
  const move = (index: number, dir: number) => {
    const next = [...sections];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(index + dir, 0, item);
    setSections(next);
  };
  return (
    <div>
      <PageTitle title="Головна сторінка" />
      <p className="mb-4 text-sm text-muted">Головний матеріал задається прапорцем у новині. Тут — порядок і кількість карток у секціях.</p>
      <ul className="space-y-2">
        {sections.map((section, index) => (
          <li key={section.id} className="grid items-center gap-2 border border-line p-3 md:grid-cols-[1fr_120px_80px_auto]">
            <input className={fieldClass} value={section.title} onChange={(e) => setSections(sections.map((row, i) => i === index ? { ...row, title: e.target.value } : row))} />
            <input className={fieldClass} type="number" min={1} max={12} value={section.article_count} onChange={(e) => setSections(sections.map((row, i) => i === index ? { ...row, article_count: Number(e.target.value) } : row))} />
            <label className="text-sm"><input type="checkbox" checked={section.active} onChange={(e) => setSections(sections.map((row, i) => i === index ? { ...row, active: e.target.checked } : row))} /> Показ</label>
            <span className="flex gap-2 text-sm">
              <button type="button" onClick={() => move(index, -1)}>Вгору</button>
              <button type="button" onClick={() => move(index, 1)}>Вниз</button>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-4 bg-accent px-3 py-2 text-sm text-accent-ink" onClick={async () => {
        await saveHomepage({ data: { sections: sections.map((section) => ({ id: section.id, title: section.title, categorySlug: section.category_slug, articleCount: section.article_count, active: section.active })) } });
        toast.success("Головну оновлено");
      }}>Зберегти</button>
    </div>
  );
}
