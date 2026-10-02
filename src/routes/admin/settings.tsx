import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTitle, errText, fieldClass } from "@/components/admin/shell";
import { changeOwnPassword, getSettingsAdmin, saveSettings } from "@/lib/news/admin.functions";
import type { SiteSettings } from "@/lib/news/types";

export const Route = createFileRoute("/admin/settings")({ component: Page });

function Page() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  useEffect(() => { getSettingsAdmin().then((data) => setSettings(data.settings)).catch((error) => toast.error(errText(error))); }, []);
  if (!settings) return <p className="text-muted">Завантаження…</p>;
  return (
    <div>
      <PageTitle title="Налаштування" />
      <form className="grid max-w-2xl gap-3" onSubmit={async (event) => { event.preventDefault(); await saveSettings({ data: { settings } }); toast.success("Збережено"); }}>
        <label className="text-sm">Назва<input className={`${fieldClass} mt-1`} value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} /></label>
        <label className="text-sm">Підзаголовок<input className={`${fieldClass} mt-1`} value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} /></label>
        <label className="text-sm">Опис<textarea className={`${fieldClass} mt-1`} rows={3} value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} /></label>
        <label className="text-sm">Пошта редакції<input className={`${fieldClass} mt-1`} value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} /></label>
        <label className="text-sm"><input type="checkbox" checked={settings.commentsEnabled} onChange={(e) => setSettings({ ...settings, commentsEnabled: e.target.checked })} /> Коментарі увімкнені</label>
        <h2 className="font-serif text-2xl">Соцмережі</h2>
        {(Object.keys(settings.socials) as (keyof SiteSettings["socials"])[]).map((key) => (
          <label key={key} className="text-sm capitalize">{key}<input className={`${fieldClass} mt-1`} value={settings.socials[key]} onChange={(e) => setSettings({ ...settings, socials: { ...settings.socials, [key]: e.target.value } })} /></label>
        ))}
        <h2 className="font-serif text-2xl">SEO за замовчуванням</h2>
        <input className={fieldClass} value={settings.seoTitle} onChange={(e) => setSettings({ ...settings, seoTitle: e.target.value })} />
        <textarea className={fieldClass} rows={3} value={settings.seoDescription} onChange={(e) => setSettings({ ...settings, seoDescription: e.target.value })} />
        <h2 className="font-serif text-2xl">Юридичні тексти</h2>
        {(Object.keys(settings.pages) as (keyof SiteSettings["pages"])[]).map((key) => (
          <label key={key} className="text-sm">{key}<textarea className={`${fieldClass} mt-1`} rows={4} value={settings.pages[key]} onChange={(e) => setSettings({ ...settings, pages: { ...settings.pages, [key]: e.target.value } })} /></label>
        ))}
        <p className="text-sm text-muted">Ключ планувальника для /api/cron/publish-scheduled: <span className="font-mono">{settings.cronSecret}</span></p>
        <button className="w-fit bg-accent px-3 py-2 text-sm text-accent-ink" type="submit">Зберегти налаштування</button>
      </form>
      <form className="mt-8 grid max-w-md gap-2 border border-line p-4" onSubmit={async (event) => { event.preventDefault(); try { await changeOwnPassword({ data: { current, next } }); toast.success("Пароль змінено"); setCurrent(""); setNext(""); } catch (error) { toast.error(errText(error)); } }}>
        <h2 className="font-serif text-2xl">Змінити пароль</h2>
        <input className={fieldClass} type="password" placeholder="Поточний" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <input className={fieldClass} type="password" placeholder="Новий, від 10 символів" value={next} onChange={(e) => setNext(e.target.value)} />
        <button className="w-fit border border-ink px-3 py-2 text-sm" type="submit">Оновити пароль</button>
      </form>
    </div>
  );
}
