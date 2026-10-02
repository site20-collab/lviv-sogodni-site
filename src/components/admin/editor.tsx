import { useState } from "react";
import { uploadMedia } from "@/lib/news/admin.functions";
import type { Block } from "@/lib/news/types";

function uid() {
  return crypto.randomUUID();
}

const TOOLS: { type: Block["type"]; label: string }[] = [
  { type: "p", label: "Абзац" },
  { type: "h2", label: "H2" },
  { type: "h3", label: "H3" },
  { type: "quote", label: "Цитата" },
  { type: "ul", label: "Список" },
  { type: "ol", label: "Нумерація" },
  { type: "image", label: "Фото" },
  { type: "video", label: "Відео" },
  { type: "table", label: "Таблиця" },
  { type: "hr", label: "Лінія" },
];

function empty(type: Block["type"]): Block {
  const id = uid();
  if (type === "quote") return { id, type, text: "", cite: "" };
  if (type === "ul" || type === "ol") return { id, type, items: [""] };
  if (type === "image") return { id, type, url: "", alt: "", caption: "" };
  if (type === "video") return { id, type, url: "", caption: "" };
  if (type === "table") return { id, type, rows: [["", ""], ["", ""]] };
  if (type === "hr") return { id, type: "hr" };
  return { id, type: type === "h2" || type === "h3" ? type : "p", text: "" };
}

async function prepareFile(file: File, alt: string) {
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
    throw new Error("Дозволені JPG, PNG, WEBP, AVIF");
  }
  if (file.size > 8_000_000) throw new Error("Файл більший за 8 МБ");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Не вдалося обробити зображення");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  const dataUrl = canvas.toDataURL(mime, 0.82);
  const dataBase64 = dataUrl.split(",")[1] ?? "";
  return uploadMedia({ data: { filename: file.name, mime, dataBase64, alt, width, height } });
}

export function BlockEditor({ blocks, onChange }: { blocks: Block[]; onChange: (blocks: Block[]) => void }) {
  const [drag, setDrag] = useState<number | null>(null);
  const update = (index: number, block: Block) => onChange(blocks.map((item, i) => (i === index ? block : item)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    onChange(next);
  };
  return (
    <div
      className="space-y-3"
      onDragOver={(event) => event.preventDefault()}
      onDrop={async (event) => {
        const file = event.dataTransfer.files?.[0];
        if (!file) return;
        event.preventDefault();
        const alt = window.prompt("Alt-текст зображення") ?? "";
        if (!alt.trim()) return;
        const uploaded = await prepareFile(file, alt.trim());
        onChange([...blocks, { id: uid(), type: "image", url: uploaded.url, alt: uploaded.alt, caption: "" }]);
      }}
    >
      <div className="flex flex-wrap gap-1">
        {TOOLS.map((tool) => (
          <button key={tool.type} type="button" className="border border-line px-2 py-1 text-xs" onClick={() => onChange([...blocks, empty(tool.type)])}>
            {tool.label}
          </button>
        ))}
      </div>
      {blocks.map((block, index) => (
        <div
          key={block.id}
          draggable
          onDragStart={() => setDrag(index)}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (drag !== null) move(drag, index);
            setDrag(null);
          }}
          className="border border-line bg-card p-3"
        >
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span>{block.type}</span>
            <span className="flex gap-2">
              <button type="button" onClick={() => move(index, index - 1)}>Вгору</button>
              <button type="button" onClick={() => move(index, index + 1)}>Вниз</button>
              <button type="button" onClick={() => onChange(blocks.filter((_, i) => i !== index))}>Прибрати</button>
            </span>
          </div>
          <BlockFields block={block} onChange={(next) => update(index, next)} />
        </div>
      ))}
      {blocks.length === 0 ? <p className="text-sm text-muted">Додайте абзац або перетягніть фото сюди.</p> : null}
    </div>
  );
}

function wrapSelection(id: string, before: string, after: string) {
  const el = document.getElementById(id) as HTMLTextAreaElement | null;
  if (!el) return;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const text = el.value.slice(start, end) || "текст";
  const next = el.value.slice(0, start) + before + text + after + el.value.slice(end);
  el.value = next;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function BlockFields({ block, onChange }: { block: Block; onChange: (block: Block) => void }) {
  if (block.type === "p" || block.type === "h2" || block.type === "h3") {
    return (
      <div>
        {block.type === "p" ? (
          <div className="mb-2 flex flex-wrap gap-1 text-xs">
            <button type="button" onClick={() => wrapSelection(block.id, "**", "**")}>Жирний</button>
            <button type="button" onClick={() => wrapSelection(block.id, "*", "*")}>Курсив</button>
            <button type="button" onClick={() => wrapSelection(block.id, "__", "__")}>Підкреслення</button>
            <button type="button" onClick={() => wrapSelection(block.id, "~~", "~~")}>Закреслення</button>
            <button type="button" onClick={() => wrapSelection(block.id, "[", "](https://)")}>Посилання</button>
          </div>
        ) : null}
        <textarea id={block.id} rows={block.type === "p" ? 5 : 2} className="w-full border border-line bg-paper px-3 py-2" value={block.text} onChange={(event) => onChange({ ...block, text: event.target.value })} />
      </div>
    );
  }
  if (block.type === "quote") {
    return (
      <div className="grid gap-2">
        <textarea rows={3} className="w-full border border-line bg-paper px-3 py-2" value={block.text} onChange={(event) => onChange({ ...block, text: event.target.value })} />
        <input className="border border-line bg-paper px-3 py-2" placeholder="Підпис" value={block.cite} onChange={(event) => onChange({ ...block, cite: event.target.value })} />
      </div>
    );
  }
  if (block.type === "ul" || block.type === "ol") {
    return (
      <div className="grid gap-2">
        {block.items.map((item, index) => (
          <input key={index} className="border border-line bg-paper px-3 py-2" value={item} onChange={(event) => onChange({ ...block, items: block.items.map((value, i) => (i === index ? event.target.value : value)) })} />
        ))}
        <button type="button" className="text-left text-sm text-accent" onClick={() => onChange({ ...block, items: [...block.items, ""] })}>Ще пункт</button>
      </div>
    );
  }
  if (block.type === "image") {
    return (
      <div className="grid gap-2">
        {block.url ? <img src={block.url} alt={block.alt} className="max-h-48 w-full object-cover" /> : null}
        <input className="border border-line bg-paper px-3 py-2" placeholder="URL" value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} />
        <input className="border border-line bg-paper px-3 py-2" placeholder="Alt" value={block.alt} onChange={(event) => onChange({ ...block, alt: event.target.value })} />
        <input className="border border-line bg-paper px-3 py-2" placeholder="Підпис" value={block.caption} onChange={(event) => onChange({ ...block, caption: event.target.value })} />
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const alt = block.alt || window.prompt("Alt-текст") || "";
          if (!alt.trim()) return;
          const uploaded = await prepareFile(file, alt.trim());
          onChange({ ...block, url: uploaded.url, alt: uploaded.alt });
        }} />
      </div>
    );
  }
  if (block.type === "video") {
    return (
      <div className="grid gap-2">
        <input className="border border-line bg-paper px-3 py-2" placeholder="Посилання YouTube або Vimeo" value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} />
        <input className="border border-line bg-paper px-3 py-2" placeholder="Підпис" value={block.caption} onChange={(event) => onChange({ ...block, caption: event.target.value })} />
      </div>
    );
  }
  if (block.type === "table") {
    return (
      <div className="grid gap-2">
        {block.rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-2 gap-2">
            {row.map((cell, cellIndex) => (
              <input key={cellIndex} className="border border-line bg-paper px-2 py-1" value={cell} onChange={(event) => onChange({ ...block, rows: block.rows.map((line, i) => i === rowIndex ? line.map((value, j) => (j === cellIndex ? event.target.value : value)) : line) })} />
            ))}
          </div>
        ))}
        <button type="button" className="text-left text-sm text-accent" onClick={() => onChange({ ...block, rows: [...block.rows, block.rows[0]?.map(() => "") ?? ["", ""]] })}>Ще рядок</button>
      </div>
    );
  }
  return <p className="text-sm text-muted">Роздільник</p>;
}

export { prepareFile };
