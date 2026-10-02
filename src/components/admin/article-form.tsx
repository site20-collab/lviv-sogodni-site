import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { COVER_LIBRARY } from "@/lib/news/constants";
import { adminRefs, restoreVersion, saveArticle } from "@/lib/news/admin.functions";
import { slugify } from "@/lib/news/slug";
import type { Block, GalleryItem } from "@/lib/news/types";
import { BlockEditor, prepareFile } from "./editor";
import { errText, fieldClass } from "./shell";

type Refs = Awaited<ReturnType<typeof adminRefs>>;
type Loaded = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: Block[];
  gallery: GalleryItem[];
  status: string;
  featured: boolean;
  breaking: boolean;
  pinned: boolean;
  coverUrl: string;
  coverAlt: string;
  coverCaption: string;
  categoryId: string;
  authorId: string;
  tagIds: string[];
  source: string;
  sourceUrl: string;
  location: string;
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  noIndex: boolean;
  scheduledAt: string | null;
  previewToken: string;
  hasAutosave?: boolean;
  versions?: { id: string; version: number; title: string; editorName: string | null; createdAt: string | null }[];
};

const empty: Loaded = {
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  content: [{ id: "start", type: "p", text: "" }],
  gallery: [],
  status: "DRAFT",
  featured: false,
  breaking: false,
  pinned: false,
  coverUrl: "",
  coverAlt: "",
  coverCaption: "",
  categoryId: "",
  authorId: "",
  tagIds: [],
  source: "Редакція «Львів Сьогодні»",
  sourceUrl: "",
  location: "Львів",
  seoTitle: "",
  seoDescription: "",
  ogImageUrl: "",
  canonicalUrl: "",
  noIndex: false,
  scheduledAt: "",
  previewToken: "",
};

export function ArticleForm({ initial }: { initial?: Loaded | null }) {
  const navigate = useNavigate();
  const [refs, setRefs] = useState<Refs | null>(null);
  const [form, setForm] = useState<Loaded>(initial ?? empty);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const base = useMemo(() => initial ?? empty, [initial]);

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);
  useEffect(() => {
    adminRefs().then(setRefs).catch((error) => toast.error(errText(error)));
  }, []);
  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);
  useEffect(() => {
    if (!dirty || form.title.trim().length < 3) return;
    const timer = window.setTimeout(() => {
      void persist("autosave", true);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [form, dirty]);

  function patch(partial: Partial<Loaded>) {
    setDirty(true);
    setForm((current) => {
      const next = { ...current, ...partial };
      if (!slugTouched && partial.title !== undefined) next.slug = slugify(partial.title);
      return next;
    });
  }

  async function persist(action: "draft" | "pending" | "publish" | "schedule" | "autosave", silent = false) {
    try {
      const result = await saveArticle({
        data: {
          ...form,
          id: form.id,
          scheduledAt: form.scheduledAt ?? "",
          action,
        },
      });
      setForm((current) => ({ ...current, id: result.id ?? current.id, slug: result.slug ?? current.slug, previewToken: result.previewToken ?? current.previewToken, status: result.status }));
      setSavedAt(new Date(result.savedAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Kyiv" }));
      setDirty(false);
      if (!silent) toast.success(action === "publish" ? "Опубліковано" : action === "schedule" ? "Заплановано" : "Збережено");
      if (!form.id && result.id) void navigate({ to: "/admin/news/$id", params: { id: result.id }, replace: true });
      return result;
    } catch (error) {
      if (!silent) toast.error(errText(error));
      return null;
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        void persist("draft");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <form className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={(event) => event.preventDefault()}>
      <div className="space-y-4">
        {form.hasAutosave ? <p className="border border-accent px-3 py-2 text-sm">Відновлено незбережений чернетковий варіант цього матеріалу.</p> : null}
        <label className="block text-sm">Заголовок
          <input className={`${fieldClass} mt-1 font-serif text-2xl`} value={form.title} onChange={(event) => patch({ title: event.target.value })} />
        </label>
        <label className="block text-sm">Адреса
          <input className={`${fieldClass} mt-1`} value={form.slug} onChange={(event) => { setSlugTouched(true); patch({ slug: slugify(event.target.value) }); }} />
        </label>
        <label className="block text-sm">Короткий опис
          <textarea className={`${fieldClass} mt-1`} rows={3} value={form.excerpt} onChange={(event) => patch({ excerpt: event.target.value })} />
        </label>
        <BlockEditor blocks={form.content} onChange={(content) => patch({ content })} />
        <p className="text-xs text-muted">{savedAt ? `Збережено о ${savedAt}` : dirty ? "Є незбережені зміни" : "Змін немає"} · Ctrl+S зберігає чернетку</p>
        <fieldset className="border border-line p-3">
          <legend className="px-1 text-sm">Галерея</legend>
          {form.gallery.map((item, index) => (
            <div key={index} className="mt-2 grid gap-2 sm:grid-cols-3">
              <input className={fieldClass} placeholder="URL" value={item.url} onChange={(event) => patch({ gallery: form.gallery.map((g, i) => i === index ? { ...g, url: event.target.value } : g) })} />
              <input className={fieldClass} placeholder="Alt" value={item.alt} onChange={(event) => patch({ gallery: form.gallery.map((g, i) => i === index ? { ...g, alt: event.target.value } : g) })} />
              <input className={fieldClass} placeholder="Підпис" value={item.caption} onChange={(event) => patch({ gallery: form.gallery.map((g, i) => i === index ? { ...g, caption: event.target.value } : g) })} />
            </div>
          ))}
          <button type="button" className="mt-2 text-sm text-accent" onClick={() => patch({ gallery: [...form.gallery, { url: "", alt: "", caption: "" }] })}>Додати фото в галерею</button>
        </fieldset>
      </div>
      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="border border-line px-3 py-2 text-sm" onClick={() => void persist("draft")}>Зберегти чернетку</button>
          <button type="button" className="border border-line px-3 py-2 text-sm" onClick={() => void persist("pending")}>На модерацію</button>
          <button type="button" className="bg-accent px-3 py-2 text-sm text-accent-ink" onClick={() => void persist("publish")}>Опублікувати</button>
          <button type="button" className="border border-ink px-3 py-2 text-sm" onClick={() => void persist("schedule")}>Запланувати</button>
        </div>
        <label className="block text-sm">Час публікації
          <input type="datetime-local" className={`${fieldClass} mt-1`} value={form.scheduledAt ? form.scheduledAt.slice(0, 16) : ""} onChange={(event) => patch({ scheduledAt: event.target.value ? new Date(event.target.value).toISOString() : "" })} />
        </label>
        <label className="block text-sm">Рубрика
          <select className={`${fieldClass} mt-1`} value={form.categoryId} onChange={(event) => patch({ categoryId: event.target.value })}>
            <option value="">—</option>
            {refs?.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="block text-sm">Автор
          <select className={`${fieldClass} mt-1`} value={form.authorId} onChange={(event) => patch({ authorId: event.target.value })}>
            <option value="">—</option>
            {refs?.authors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <fieldset className="max-h-40 overflow-auto border border-line p-2 text-sm">
          <legend>Теги</legend>
          {refs?.tags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-2 py-0.5">
              <input type="checkbox" checked={form.tagIds.includes(tag.id)} onChange={(event) => patch({ tagIds: event.target.checked ? [...form.tagIds, tag.id] : form.tagIds.filter((id) => id !== tag.id) })} />
              {tag.name}
            </label>
          ))}
        </fieldset>
        <label className="block text-sm">Головне фото
          <select className={`${fieldClass} mt-1`} value={form.coverUrl} onChange={(event) => {
            const found = COVER_LIBRARY.find((item) => item.url === event.target.value);
            patch({ coverUrl: event.target.value, coverAlt: found?.alt ?? form.coverAlt });
          }}>
            <option value="">Без фото</option>
            {COVER_LIBRARY.map((item) => <option key={item.url} value={item.url}>{item.alt}</option>)}
          </select>
        </label>
        <input className={fieldClass} placeholder="Або URL фото" value={form.coverUrl} onChange={(event) => patch({ coverUrl: event.target.value })} />
        <input className={fieldClass} placeholder="Alt головного фото" value={form.coverAlt} onChange={(event) => patch({ coverAlt: event.target.value })} />
        <input className={fieldClass} placeholder="Підпис до фото" value={form.coverCaption} onChange={(event) => patch({ coverCaption: event.target.value })} />
        <input type="file" accept="image/*" onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const alt = form.coverAlt || window.prompt("Alt-текст") || "";
          if (!alt.trim()) return toast.error("Без alt-тексту фото не зберігаємо");
          try {
            const uploaded = await prepareFile(file, alt.trim());
            patch({ coverUrl: uploaded.url, coverAlt: uploaded.alt });
          } catch (error) {
            toast.error(errText(error));
          }
        }} />
        {form.coverUrl ? <img src={form.coverUrl} alt="" className="aspect-video w-full object-cover" /> : null}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(event) => patch({ featured: event.target.checked })} /> Головний матеріал</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.breaking} onChange={(event) => patch({ breaking: event.target.checked })} /> Термінова новина</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.pinned} onChange={(event) => patch({ pinned: event.target.checked })} /> Закріпити</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.noIndex} onChange={(event) => patch({ noIndex: event.target.checked })} /> Не індексувати</label>
        <input className={fieldClass} placeholder="Джерело" value={form.source} onChange={(event) => patch({ source: event.target.value })} />
        <input className={fieldClass} placeholder="Посилання на джерело" value={form.sourceUrl} onChange={(event) => patch({ sourceUrl: event.target.value })} />
        <input className={fieldClass} placeholder="Локація" value={form.location} onChange={(event) => patch({ location: event.target.value })} />
        <details>
          <summary className="cursor-pointer text-sm">SEO</summary>
          <div className="mt-2 grid gap-2">
            <input className={fieldClass} placeholder="SEO title" value={form.seoTitle} onChange={(event) => patch({ seoTitle: event.target.value })} />
            <textarea className={fieldClass} placeholder="SEO description" rows={3} value={form.seoDescription} onChange={(event) => patch({ seoDescription: event.target.value })} />
            <input className={fieldClass} placeholder="OG image" value={form.ogImageUrl} onChange={(event) => patch({ ogImageUrl: event.target.value })} />
            <input className={fieldClass} placeholder="Canonical URL" value={form.canonicalUrl} onChange={(event) => patch({ canonicalUrl: event.target.value })} />
          </div>
        </details>
        {form.slug && form.previewToken ? (
          <a className="inline-block text-sm text-accent" href={`/news/${form.slug}?preview=${form.previewToken}`} target="_blank" rel="noreferrer">Переглянути</a>
        ) : null}
        {base.versions && base.versions.length > 0 ? (
          <div className="text-sm">
            <p className="font-medium">Історія</p>
            <ul className="mt-1 space-y-1">
              {base.versions.map((version) => (
                <li key={version.id} className="flex items-center justify-between gap-2">
                  <span>v{version.version} · {version.editorName}</span>
                  <button type="button" className="text-accent" onClick={async () => {
                    if (!confirm("Відновити цю версію?")) return;
                    await restoreVersion({ data: { articleId: form.id, versionId: version.id } });
                    toast.success("Версію відновлено");
                    window.location.reload();
                  }}>Відновити</button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </form>
  );
}
