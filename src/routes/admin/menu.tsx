import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTitle, errText, fieldClass } from "@/components/admin/shell";
import { listMenu, saveMenu } from "@/lib/news/admin.functions";

export const Route = createFileRoute("/admin/menu")({ component: Page });

type Item = { id: string; label: string; url: string; target: string; active: boolean };

function Page() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => { listMenu().then((data) => setItems(data as Item[])).catch((error) => toast.error(errText(error))); }, []);
  const move = (index: number, dir: number) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    setItems(next);
  };
  return (
    <div>
      <PageTitle title="Меню" />
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={item.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const from = Number(event.dataTransfer.getData("text/plain")); move(from, index - from); }} className="grid gap-2 border border-line p-2 md:grid-cols-[1fr_1fr_auto]">
            <input className={fieldClass} value={item.label} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, label: e.target.value } : row))} />
            <input className={fieldClass} value={item.url} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, url: e.target.value } : row))} />
            <span className="flex gap-2 text-sm">
              <button type="button" onClick={() => move(index, -1)}>Вгору</button>
              <button type="button" onClick={() => move(index, 1)}>Вниз</button>
              <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))}>Прибрати</button>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-3 text-sm text-accent" onClick={() => setItems([...items, { id: crypto.randomUUID(), label: "Новий пункт", url: "/", target: "_self", active: true }])}>Додати пункт</button>
      <button type="button" className="mt-4 block bg-accent px-3 py-2 text-sm text-accent-ink" onClick={async () => { await saveMenu({ data: { items } }); toast.success("Меню збережено"); }}>Зберегти меню</button>
    </div>
  );
}
