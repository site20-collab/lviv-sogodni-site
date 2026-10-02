import { useState } from "react";

export type Consent = { necessary: true; analytics: boolean; marketing: boolean };

const KEY = "ls-consent";

export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    return { necessary: true, analytics: Boolean(parsed.analytics), marketing: Boolean(parsed.marketing) };
  } catch {
    return null;
  }
}

function writeConsent(value: Consent) {
  localStorage.setItem(KEY, JSON.stringify(value));
}

export function CookieBanner({ consent, onChange }: { consent: Consent | null; onChange: (value: Consent) => void }) {
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  if (consent) return null;
  const save = (value: Consent) => {
    writeConsent(value);
    onChange(value);
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-card p-4 shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-serif text-xl">Cookie</p>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Обов’язкові cookie тримають сесію редакції. Аналітика рахує перегляди, маркетинг показує рекламні блоки. Без згоди ці скрипти не вмикаються.
          </p>
          {open ? (
            <div className="mt-3 space-y-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked disabled /> Необхідні</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /> Аналітика</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /> Маркетинг</label>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="border border-line px-3 py-2 text-sm" onClick={() => save({ necessary: true, analytics: false, marketing: false })}>Відхилити необов’язкові</button>
          <button type="button" className="border border-line px-3 py-2 text-sm" onClick={() => setOpen(true)}>Налаштувати</button>
          {open ? (
            <button type="button" className="bg-ink px-3 py-2 text-sm text-paper" onClick={() => save({ necessary: true, analytics, marketing })}>Зберегти вибір</button>
          ) : null}
          <button type="button" className="bg-accent px-3 py-2 text-sm text-accent-ink" onClick={() => save({ necessary: true, analytics: true, marketing: true })}>Прийняти всі</button>
        </div>
      </div>
    </div>
  );
}

export function AdFrame({ code, allow }: { code?: string | null; allow: boolean }) {
  if (!code || !allow) return null;
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:Georgia,serif;background:#faf8f4}</style></head><body>${code}</body></html>`;
  return (
    <aside className="my-6 border border-line bg-card" aria-label="Рекламний блок">
      <p className="px-3 pt-2 text-xs uppercase tracking-widest text-muted">Реклама</p>
      <iframe title="Реклама" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={srcDoc} className="h-28 w-full" />
    </aside>
  );
}
