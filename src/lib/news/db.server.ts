import { hashPassword } from "better-auth/crypto";
import { getSql, type Sql } from "@/lib/db";
import { DEMO_EMAIL, DEMO_NAME, DEMO_PASSWORD } from "./constants";
import { asJson, isoOf, weatherLabel } from "./format";
import { articles, authors, categories, menu, pages, sections, tags } from "./seed-data";
import type { ArticleCard, ArticleStatus, Block, GalleryItem, SiteSettings } from "./types";

const globalBoot = globalThis as typeof globalThis & { __lsBoot?: Promise<void> };
let demoAdminReady = false;
let seedViewsReady = false;

function id() {
  return crypto.randomUUID();
}

export function defaultSettings(cronSecret: string): SiteSettings {
  return {
    siteName: "Львів Сьогодні",
    tagline: "Новини Львова та області",
    description:
      "Щоденне міське медіа: Львів, область, влада, вулиці, культура і те, що змінює дорогу додому.",
    contactEmail: "redaktsiia@lviv-sogodni.media",
    commentsEnabled: true,
    socials: {
      telegram: "https://t.me/lvivsogodni",
      instagram: "https://instagram.com/lvivsogodni",
      facebook: "https://facebook.com/lvivsogodni",
      youtube: "https://youtube.com/@lvivsogodni",
      tiktok: "https://www.tiktok.com/@lvivsogodni",
      x: "https://x.com/lvivsogodni",
    },
    seoTitle: "Львів Сьогодні — новини Львова та області",
    seoDescription:
      "Оперативні новини Львова і Львівщини: місто, влада, дороги, культура, спорт і корисні пояснення.",
    cronSecret,
    pages,
  };
}

export async function ready(): Promise<Sql> {
  const sql = await getSql();
  globalBoot.__lsBoot ??= bootstrap(sql).catch((error: unknown) => {
    globalBoot.__lsBoot = undefined;
    throw error;
  });
  await globalBoot.__lsBoot;
  if (!demoAdminReady) {
    await ensureDemoAdmin(sql);
    demoAdminReady = true;
  }
  if (!seedViewsReady) {
    const counted = await sql<{ n: number }>`select count(*)::int as n from page_views`;
    if (Number(counted[0]?.n ?? 0) === 0) await seedViews(sql);
    seedViewsReady = true;
  }
  await publishDue(sql);
  return sql;
}

export async function publishDue(sql: Sql): Promise<number> {
  const rows = await sql<{ id: string }>`
    update articles
    set status = 'PUBLISHED',
        published_at = coalesce(scheduled_at, now()),
        updated_at = now()
    where status = 'SCHEDULED'
      and scheduled_at is not null
      and scheduled_at <= now()
    returning id
  `;
  return rows.length;
}

async function bootstrap(sql: Sql): Promise<void> {
  const flag = await sql<{ key: string }>`select key from site_settings where key = 'site'`;
  if (flag.length > 0) return;

  const cronSecret = crypto.randomUUID().replace(/-/g, "");
  const settings = defaultSettings(cronSecret);
  await sql`insert into site_settings (key, value) values ('site', ${JSON.stringify(settings)}::jsonb)`;

  for (const [cid, name, slug, description, sort, nav] of categories) {
    await sql`
      insert into categories (id, name, slug, description, seo_title, seo_description, sort_order, active, show_in_nav)
      values (${cid}, ${name}, ${slug}, ${description}, ${name + " — Львів Сьогодні"}, ${description}, ${sort}, true, ${nav})
      on conflict (id) do nothing
    `;
  }
  for (const [tid, name, slug] of tags) {
    await sql`
      insert into tags (id, name, slug, description)
      values (${tid}, ${name}, ${slug}, ${"Матеріали за темою «" + name + "»"})
      on conflict (id) do nothing
    `;
  }
  for (const author of authors) {
    await sql`
      insert into authors (id, slug, name, email, bio, active)
      values (${author.id}, ${author.slug}, ${author.name}, ${author.email}, ${author.bio}, true)
      on conflict (id) do nothing
    `;
  }

  const catBySlug = new Map<string, string>(categories.map((c) => [c[2], c[0]]));
  const authorBySlug = new Map<string, string>(authors.map((a) => [a.slug, a.id]));
  const tagBySlug = new Map<string, string>(tags.map((t) => [t[2], t[0]]));

  for (const article of articles) {
    const blocks: Block[] = article.body.map((block) => {
      const bid = id();
      if (block.t === "p" || block.t === "h2" || block.t === "h3") return { id: bid, type: block.t, text: block.text };
      if (block.t === "quote") return { id: bid, type: "quote", text: block.text, cite: block.cite ?? "" };
      if (block.t === "ul" || block.t === "ol") return { id: bid, type: block.t, items: block.items };
      if (block.t === "table") return { id: bid, type: "table", rows: block.rows };
      return { id: bid, type: "p", text: "" };
    });
    const publishedAt =
      article.status === "PUBLISHED" || article.status === "ARCHIVED"
        ? new Date(Date.now() - (article.hoursAgo ?? 1) * 3600_000).toISOString()
        : null;
    const scheduledAt = article.scheduledInHours
      ? new Date(Date.now() + article.scheduledInHours * 3600_000).toISOString()
      : null;
    await sql`
      insert into articles (
        id, title, slug, excerpt, content, status, featured, breaking, pinned,
        cover_url, cover_alt, cover_caption, author_id, category_id, source, location,
        seo_title, seo_description, no_index, published_at, scheduled_at, view_count,
        preview_token, created_at, updated_at
      ) values (
        ${article.id}, ${article.title}, ${article.slug}, ${article.excerpt},
        ${JSON.stringify(blocks)}::jsonb, ${article.status}, ${Boolean(article.featured)},
        ${Boolean(article.breaking)}, ${Boolean(article.pinned)}, ${article.cover},
        ${article.coverAlt}, ${article.coverCaption ?? ""}, ${authorBySlug.get(article.author) ?? null},
        ${catBySlug.get(article.category) ?? null}, ${"Редакція «Львів Сьогодні»"}, ${article.location},
        ${article.title}, ${article.excerpt}, false, ${publishedAt}, ${scheduledAt}, ${article.views},
        ${id()}, now(), now()
      )
      on conflict (id) do nothing
    `;
    for (const tagSlug of article.tags) {
      const tagId = tagBySlug.get(tagSlug);
      if (!tagId) continue;
      await sql`
        insert into article_tags (article_id, tag_id) values (${article.id}, ${tagId})
        on conflict do nothing
      `;
    }
  }

  for (const [mid, label, url, order] of menu) {
    await sql`
      insert into menu_items (id, label, url, target, active, sort_order)
      values (${mid}, ${label}, ${url}, '_self', true, ${order})
      on conflict (id) do nothing
    `;
  }
  for (const [sid, key, title, slug, order, count] of sections) {
    await sql`
      insert into homepage_sections (id, section_key, title, category_slug, sort_order, article_count, active)
      values (${sid}, ${key}, ${title}, ${slug}, ${order}, ${count}, true)
      on conflict (id) do nothing
    `;
  }

  await sql`
    insert into ads (id, name, code, placement, active)
    values (
      'ad-home',
      'Звернення до редакції',
      ${'<div style="font-family:Georgia,serif;padding:18px 16px;text-align:center;color:#1c1917"><div style="letter-spacing:.18em;font-size:11px">РЕДАКЦІЯ</div><div style="font-size:22px;margin-top:8px">Надішліть новину міста</div><div style="margin-top:6px;font-family:sans-serif;font-size:14px">redaktsiia@lviv-sogodni.media</div></div>'},
      'homepage',
      true
    )
    on conflict (id) do nothing
  `;

  await seedViews(sql);
}

async function seedViews(sql: Sql): Promise<void> {
  const published = articles.filter((a) => a.status === "PUBLISHED");
  const devices = ["mobile", "desktop", "tablet"];
  const browsers = ["Chrome", "Safari", "Firefox"];
  const systems = ["Android", "iOS", "Windows", "macOS"];
  const refs = ["", "https://google.com", "https://t.me", "https://facebook.com", "https://news.google.com"];
  for (let i = 0; i < 180; i += 1) {
    const article = published[i % published.length];
    const hours = (i * 4) % (24 * 28);
    const at = new Date(Date.now() - hours * 3600_000).toISOString();
    await sql`
      insert into page_views (id, path, article_id, session_id, referrer, device, browser, os, is_seed, created_at)
      values (
        ${"seed-view-" + i},
        ${"/news/" + (article?.slug ?? "")},
        ${article?.id ?? null},
        ${"seed-session-" + (i % 40)},
        ${refs[i % refs.length]},
        ${devices[i % 3 === 0 ? 1 : i % 7 === 0 ? 2 : 0]},
        ${browsers[i % browsers.length]},
        ${systems[i % systems.length]},
        true,
        ${at}
      )
      on conflict (id) do nothing
    `;
  }
}

async function ensureCredentialAdmin(sql: Sql, email: string, name: string, plain: string): Promise<void> {
  const now = new Date().toISOString();
  const password = await hashPassword(plain);
  const existing = await sql<{ id: string }>`select id from "user" where lower(email) = lower(${email})`;
  let userId = existing[0]?.id;
  if (!userId) {
    userId = id();
    await sql`
      insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
      values (${userId}, ${name}, ${email}, true, ${now}, ${now})
      on conflict ("email") do nothing
    `;
    const again = await sql<{ id: string }>`select id from "user" where lower(email) = lower(${email})`;
    userId = again[0]?.id;
  }
  if (!userId) throw new Error("Не вдалося створити редактора");
  const accounts = await sql<{ id: string; password: string | null }>`
    select id, password from "account" where "userId" = ${userId} and "providerId" = 'credential'
  `;
  const account = accounts[0];
  if (!account) {
    await sql`
      insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
      values (${id()}, ${email}, 'credential', ${userId}, ${password}, ${now}, ${now})
    `;
  } else if (!account.password || !account.password.includes(":")) {
    await sql`update "account" set password = ${password}, "updatedAt" = ${now}, "accountId" = ${email} where id = ${account.id}`;
  }
  await sql`
    insert into staff (user_id, role, display_name)
    values (${userId}, 'SUPER_ADMIN', ${name})
    on conflict (user_id) do nothing
  `;
}

async function ensureDemoAdmin(sql: Sql): Promise<void> {
  await ensureCredentialAdmin(sql, DEMO_EMAIL, DEMO_NAME, DEMO_PASSWORD);
  await ensureCredentialAdmin(sql, "denys20smm@gmail.com", "Денис", "Lviv-Denys-2026!");
}

const CARD_SELECT = `
  select
    a.id, a.title, a.slug, a.excerpt, a.status, a.featured, a.breaking, a.pinned,
    a.cover_url, a.cover_alt, a.published_at, a.updated_at, a.view_count,
    c.name as category_name, c.slug as category_slug,
    au.name as author_name, au.slug as author_slug
  from articles a
  left join categories c on c.id = a.category_id
  left join authors au on au.id = a.author_id
`;

type CardRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: ArticleStatus;
  featured: boolean;
  breaking: boolean;
  pinned: boolean;
  cover_url: string | null;
  cover_alt: string | null;
  published_at: unknown;
  updated_at: unknown;
  view_count: number;
  category_name: string | null;
  category_slug: string | null;
  author_name: string | null;
  author_slug: string | null;
};

export function mapCard(row: CardRow): ArticleCard {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    status: row.status,
    featured: Boolean(row.featured),
    breaking: Boolean(row.breaking),
    pinned: Boolean(row.pinned),
    coverUrl: row.cover_url,
    coverAlt: row.cover_alt,
    authorName: row.author_name,
    authorSlug: row.author_slug,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    publishedAt: isoOf(row.published_at),
    updatedAt: isoOf(row.updated_at),
    viewCount: Number(row.view_count ?? 0),
  };
}

export async function selectCards(sql: Sql, where: string, params: unknown[], extra = ""): Promise<ArticleCard[]> {
  const rows = await sql.query<CardRow>(`${CARD_SELECT} ${where} ${extra}`, params);
  return rows.map(mapCard);
}

export async function loadSettings(sql: Sql): Promise<SiteSettings> {
  const rows = await sql<{ value: unknown }>`select value from site_settings where key = 'site'`;
  const fallback = defaultSettings("");
  const value = asJson<Partial<SiteSettings>>(rows[0]?.value, {});
  return {
    ...fallback,
    ...value,
    socials: { ...fallback.socials, ...(value.socials ?? {}) },
    pages: { ...fallback.pages, ...(value.pages ?? {}) },
  };
}

type Weather = { temp: number; label: string };
const weatherCache = globalThis as typeof globalThis & {
  __lsWeather?: { at: number; value: Weather | null };
};

export async function loadWeather(): Promise<Weather | null> {
  const cached = weatherCache.__lsWeather;
  if (cached && Date.now() - cached.at < (cached.value ? 30 : 2) * 60_000) return cached.value;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=49.8397&longitude=24.0297&current=temperature_2m,weather_code",
      { signal: ctrl.signal },
    );
    clearTimeout(timer);
    if (!res.ok) throw new Error("weather");
    const json = (await res.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
    const temp = Math.round(Number(json.current?.temperature_2m));
    const code = Number(json.current?.weather_code ?? 0);
    if (!Number.isFinite(temp)) throw new Error("weather-temp");
    const value = { temp, label: weatherLabel(code) };
    weatherCache.__lsWeather = { at: Date.now(), value };
    return value;
  } catch {
    weatherCache.__lsWeather = { at: Date.now(), value: null };
    return null;
  }
}

export async function loadBlocks(value: unknown): Promise<Block[]> {
  const blocks = asJson<Block[]>(value, []);
  return Array.isArray(blocks) ? blocks : [];
}

export function galleryOf(value: unknown): GalleryItem[] {
  const items = asJson<GalleryItem[]>(value, []);
  return Array.isArray(items) ? items : [];
}
