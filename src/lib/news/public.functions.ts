import { createServerFn } from "@tanstack/react-start";
import { galleryOf, loadSettings, loadWeather, mapCard, publishDue, ready, selectCards } from "./db.server";
import { isoOf } from "./format";
import { likePattern } from "./slug";
import type { ArticleCard, ArticleDetail, Block, Chrome, HomeSection } from "./types";

export const getChrome = createServerFn({ method: "GET" }).handler(async (): Promise<Chrome> => {
  const sql = await ready();
  const [settings, menuRows, breaking, weather] = await Promise.all([
    loadSettings(sql),
    sql<{ id: string; label: string; url: string; target: string; active: boolean; sort_order: number }>`
      select id, label, url, target, active, sort_order from menu_items where active = true order by sort_order, label
    `,
    selectCards(
      sql,
      `where a.status = 'PUBLISHED' and (a.breaking = true or a.published_at is not null)`,
      [],
      `order by a.breaking desc, a.published_at desc nulls last limit 12`,
    ),
    loadWeather(),
  ]);
  const breakingOnly = breaking.filter((item) => item.breaking);
  return {
    settings,
    menu: menuRows.map((row) => ({
      id: row.id,
      label: row.label,
      url: row.url,
      target: row.target,
      active: Boolean(row.active),
      sortOrder: row.sort_order,
    })),
    breaking: (breakingOnly.length > 0 ? breakingOnly : breaking).slice(0, 10),
    weather,
  };
});

export const getHomepage = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await ready();
  const published = await selectCards(
    sql,
    `where a.status = 'PUBLISHED'`,
    [],
    `order by a.pinned desc, a.published_at desc nulls last limit 80`,
  );
  const featured = published.find((item) => item.featured) ?? published[0] ?? null;
  const side = published.filter((item) => item.id !== featured?.id).slice(0, 4);
  const sectionRows = await sql<{
    id: string;
    section_key: string;
    title: string;
    category_slug: string | null;
    article_count: number;
    active: boolean;
  }>`
    select id, section_key, title, category_slug, article_count, active
    from homepage_sections where active = true order by sort_order, title
  `;
  const popular = [...published].sort((a, b) => b.viewCount - a.viewCount);
  const sections: HomeSection[] = sectionRows.map((section) => {
    const count = Number(section.article_count) || 4;
    if (section.section_key === "popular") {
      return { id: section.id, title: section.title, href: "/news", items: popular.slice(0, count) };
    }
    if (section.section_key === "latest" || !section.category_slug) {
      return {
        id: section.id,
        title: section.title,
        href: "/news",
        items: published.slice(0, count),
      };
    }
    return {
      id: section.id,
      title: section.title,
      href: `/category/${section.category_slug}`,
      items: published.filter((item) => item.categorySlug === section.category_slug).slice(0, count),
    };
  });
  const ads = await loadAds(sql, "homepage");
  return { hero: featured, side, sections, popular: popular.slice(0, 5), ads };
});

async function loadAds(sql: Awaited<ReturnType<typeof ready>>, placement: string) {
  const rows = await sql<{ id: string; name: string; code: string; placement: string }>`
    select id, name, code, placement from ads
    where active = true and placement = ${placement}
      and (start_date is null or start_date <= current_date)
      and (end_date is null or end_date >= current_date)
    order by created_at desc
  `;
  return rows;
}

export const getArticle = createServerFn({ method: "GET" })
  .validator((input: { slug: string; preview?: string }) => ({
    slug: String(input?.slug ?? "").slice(0, 120),
    preview: String(input?.preview ?? "").slice(0, 80),
  }))
  .handler(async ({ data }): Promise<ArticleDetail | null> => {
    const sql = await ready();
    const rows = await sql<Record<string, unknown>>`
      select a.*, c.name as category_name, c.slug as category_slug,
             au.name as author_name, au.slug as author_slug, au.bio as author_bio
      from articles a
      left join categories c on c.id = a.category_id
      left join authors au on au.id = a.author_id
      where a.slug = ${data.slug}
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    const status = String(row.status);
    const token = String(row.preview_token ?? "");
    const visible = status === "PUBLISHED" || (data.preview.length > 8 && data.preview === token);
    if (!visible) return null;
    const card = mapCard({
      id: String(row.id),
      title: String(row.title),
      slug: String(row.slug),
      excerpt: String(row.excerpt ?? ""),
      status: status as ArticleCard["status"],
      featured: Boolean(row.featured),
      breaking: Boolean(row.breaking),
      pinned: Boolean(row.pinned),
      cover_url: (row.cover_url as string | null) ?? null,
      cover_alt: (row.cover_alt as string | null) ?? null,
      published_at: row.published_at,
      updated_at: row.updated_at,
      view_count: Number(row.view_count ?? 0),
      category_name: (row.category_name as string | null) ?? null,
      category_slug: (row.category_slug as string | null) ?? null,
      author_name: (row.author_name as string | null) ?? null,
      author_slug: (row.author_slug as string | null) ?? null,
    });
    const tagRows = await sql<{ name: string; slug: string }>`
      select t.name, t.slug from tags t
      join article_tags at on at.tag_id = t.id
      where at.article_id = ${card.id}
      order by t.name
    `;
    const related = await selectCards(
      sql,
      `where a.status = 'PUBLISHED' and a.id <> $1 and (a.category_id = $2 or a.id in (
        select article_id from article_tags where tag_id in (select tag_id from article_tags where article_id = $1)
      ))`,
      [card.id, row.category_id],
      `order by (a.category_id = $2) desc, a.published_at desc nulls last limit 4`,
    );
    const popular = await selectCards(
      sql,
      `where a.status = 'PUBLISHED' and a.id <> $1`,
      [card.id],
      `order by a.view_count desc, a.published_at desc nulls last limit 5`,
    );
    const comments = await sql<{ id: string; author_name: string; body: string; created_at: unknown }>`
      select id, author_name, body, created_at from comments
      where article_id = ${card.id} and status = 'APPROVED'
      order by created_at asc
      limit 50
    `;
    const content = galleryOf(row.content) as unknown as Block[];
    const blocks = Array.isArray(row.content)
      ? (row.content as Block[])
      : (JSON.parse(typeof row.content === "string" ? row.content : "[]") as Block[]);
    const ads = {
      top: await loadAds(sql, "article_top"),
      middle: await loadAds(sql, "article_middle"),
      bottom: await loadAds(sql, "article_bottom"),
    };
    return {
      ...card,
      content: Array.isArray(blocks) ? blocks : content,
      gallery: galleryOf(row.gallery),
      coverCaption: (row.cover_caption as string | null) ?? null,
      source: (row.source as string | null) ?? null,
      sourceUrl: (row.source_url as string | null) ?? null,
      location: (row.location as string | null) ?? null,
      seoTitle: (row.seo_title as string | null) ?? null,
      seoDescription: (row.seo_description as string | null) ?? null,
      canonicalUrl: (row.canonical_url as string | null) ?? null,
      noIndex: Boolean(row.no_index) || status !== "PUBLISHED",
      ogImageUrl: (row.og_image_url as string | null) ?? null,
      scheduledAt: isoOf(row.scheduled_at),
      authorBio: (row.author_bio as string | null) ?? null,
      tags: tagRows,
      related,
      popular,
      comments: comments.map((item) => ({
        id: item.id,
        authorName: item.author_name,
        body: item.body,
        createdAt: isoOf(item.created_at) ?? "",
      })),
      ads,
    } as ArticleDetail & {
      ads: { top: { id: string; code: string }[]; middle: { id: string; code: string }[]; bottom: { id: string; code: string }[] };
    };
  });

export const listNews = createServerFn({ method: "GET" })
  .validator((input: { page?: number }) => ({ page: Math.max(1, Number(input?.page) || 1) }))
  .handler(async ({ data }) => {
    const sql = await ready();
    const pageSize = 12;
    const offset = (data.page - 1) * pageSize;
    const totalRows = await sql<{ n: number }>`select count(*)::int as n from articles where status = 'PUBLISHED'`;
    const items = await selectCards(
      sql,
      `where a.status = 'PUBLISHED'`,
      [],
      `order by a.published_at desc nulls last limit ${pageSize} offset ${offset}`,
    );
    return { items, total: Number(totalRows[0]?.n ?? 0), page: data.page, pageSize };
  });

export const listCategory = createServerFn({ method: "GET" })
  .validator((input: { slug: string; page?: number }) => ({
    slug: String(input?.slug ?? "").slice(0, 80),
    page: Math.max(1, Number(input?.page) || 1),
  }))
  .handler(async ({ data }) => {
    const sql = await ready();
    const cats = await sql<{
      id: string;
      name: string;
      slug: string;
      description: string;
      seo_title: string | null;
      seo_description: string | null;
    }>`select id, name, slug, description, seo_title, seo_description from categories where slug = ${data.slug} and active = true`;
    const category = cats[0];
    if (!category) return null;
    const pageSize = 12;
    const offset = (data.page - 1) * pageSize;
    const totalRows = await sql<{ n: number }>`
      select count(*)::int as n from articles where status = 'PUBLISHED' and category_id = ${category.id}
    `;
    const items = await selectCards(
      sql,
      `where a.status = 'PUBLISHED' and a.category_id = $1`,
      [category.id],
      `order by a.pinned desc, a.published_at desc nulls last limit ${pageSize} offset ${offset}`,
    );
    return {
      category: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        seoTitle: category.seo_title,
        seoDescription: category.seo_description,
      },
      items,
      total: Number(totalRows[0]?.n ?? 0),
      page: data.page,
      pageSize,
    };
  });

export const listTag = createServerFn({ method: "GET" })
  .validator((input: { slug: string; page?: number }) => ({
    slug: String(input?.slug ?? "").slice(0, 80),
    page: Math.max(1, Number(input?.page) || 1),
  }))
  .handler(async ({ data }) => {
    const sql = await ready();
    const found = await sql<{ id: string; name: string; slug: string; description: string }>`
      select id, name, slug, description from tags where slug = ${data.slug}
    `;
    const tag = found[0];
    if (!tag) return null;
    const pageSize = 12;
    const offset = (data.page - 1) * pageSize;
    const totalRows = await sql<{ n: number }>`
      select count(*)::int as n from articles a
      join article_tags at on at.article_id = a.id
      where a.status = 'PUBLISHED' and at.tag_id = ${tag.id}
    `;
    const items = await selectCards(
      sql,
      `where a.status = 'PUBLISHED' and a.id in (select article_id from article_tags where tag_id = $1)`,
      [tag.id],
      `order by a.published_at desc nulls last limit ${pageSize} offset ${offset}`,
    );
    return { tag, items, total: Number(totalRows[0]?.n ?? 0), page: data.page, pageSize };
  });

export const listAuthor = createServerFn({ method: "GET" })
  .validator((input: { slug: string; page?: number }) => ({
    slug: String(input?.slug ?? "").slice(0, 80),
    page: Math.max(1, Number(input?.page) || 1),
  }))
  .handler(async ({ data }) => {
    const sql = await ready();
    const found = await sql<{
      id: string;
      name: string;
      slug: string;
      bio: string;
      avatar_url: string | null;
    }>`select id, name, slug, bio, avatar_url from authors where slug = ${data.slug} and active = true`;
    const author = found[0];
    if (!author) return null;
    const pageSize = 12;
    const offset = (data.page - 1) * pageSize;
    const totalRows = await sql<{ n: number }>`
      select count(*)::int as n from articles where status = 'PUBLISHED' and author_id = ${author.id}
    `;
    const items = await selectCards(
      sql,
      `where a.status = 'PUBLISHED' and a.author_id = $1`,
      [author.id],
      `order by a.published_at desc nulls last limit ${pageSize} offset ${offset}`,
    );
    return {
      author: { name: author.name, slug: author.slug, bio: author.bio, avatarUrl: author.avatar_url },
      items,
      total: Number(totalRows[0]?.n ?? 0),
      page: data.page,
      pageSize,
    };
  });

export const searchNews = createServerFn({ method: "GET" })
  .validator((input: { q?: string; page?: number; sort?: string }) => ({
    q: String(input?.q ?? "").trim().slice(0, 80),
    page: Math.max(1, Number(input?.page) || 1),
    sort: input?.sort === "newest" ? "newest" : "relevance",
  }))
  .handler(async ({ data }) => {
    const sql = await ready();
    if (data.q.length < 2) return { items: [] as ArticleCard[], total: 0, page: 1, pageSize: 12, q: data.q, sort: data.sort };
    const pattern = likePattern(data.q);
    const pageSize = 12;
    const offset = (data.page - 1) * pageSize;
    const where = `
      where a.status = 'PUBLISHED' and (
        a.title ilike $1 escape '\\'
        or a.excerpt ilike $1 escape '\\'
        or a.content::text ilike $1 escape '\\'
        or c.name ilike $1 escape '\\'
        or exists (
          select 1 from article_tags at
          join tags t on t.id = at.tag_id
          where at.article_id = a.id and t.name ilike $1 escape '\\'
        )
      )
    `;
    const totalRows = await sql.query<{ n: number }>(
      `select count(*)::int as n from articles a left join categories c on c.id = a.category_id ${where}`,
      [pattern],
    );
    const order =
      data.sort === "newest"
        ? "order by a.published_at desc nulls last"
        : `order by case when a.title ilike $1 escape '\\' then 0 when a.excerpt ilike $1 escape '\\' then 1 else 2 end, a.published_at desc nulls last`;
    const items = await selectCards(sql, where, [pattern], `${order} limit ${pageSize} offset ${offset}`);
    return { items, total: Number(totalRows[0]?.n ?? 0), page: data.page, pageSize, q: data.q, sort: data.sort };
  });

export const postComment = createServerFn({ method: "POST" })
  .validator((input: { articleId?: string; name?: string; email?: string; body?: string; company?: string }) => ({
    articleId: String(input?.articleId ?? "").slice(0, 80),
    name: String(input?.name ?? "").trim().slice(0, 80),
    email: String(input?.email ?? "").trim().slice(0, 120),
    body: String(input?.body ?? "").replace(/<[^>]*>/g, "").trim().slice(0, 2000),
    company: String(input?.company ?? ""),
  }))
  .handler(async ({ data }) => {
    if (data.company) return { ok: true as const };
    if (data.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.body.length < 4) {
      throw new Error("Перевірте ім'я, пошту і текст коментаря");
    }
    const sql = await ready();
    const settings = await loadSettings(sql);
    if (!settings.commentsEnabled) throw new Error("Коментарі вимкнені");
    const recent = await sql<{ n: number }>`
      select count(*)::int as n from comments
      where author_email = ${data.email} and created_at > now() - interval '10 minutes'
    `;
    if (Number(recent[0]?.n ?? 0) >= 3) throw new Error("Забагато коментарів. Спробуйте пізніше");
    const links = (data.body.match(/https?:\/\//g) ?? []).length;
    const status = links > 2 ? "SPAM" : "PENDING";
    await sql`
      insert into comments (id, article_id, author_name, author_email, body, status)
      values (${crypto.randomUUID()}, ${data.articleId}, ${data.name}, ${data.email}, ${data.body}, ${status})
    `;
    return { ok: true as const };
  });

export const postContact = createServerFn({ method: "POST" })
  .validator((input: { name?: string; email?: string; message?: string; company?: string }) => ({
    name: String(input?.name ?? "").trim().slice(0, 80),
    email: String(input?.email ?? "").trim().slice(0, 120),
    message: String(input?.message ?? "").trim().slice(0, 4000),
    company: String(input?.company ?? ""),
  }))
  .handler(async ({ data }) => {
    if (data.company) return { ok: true as const };
    if (data.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.message.length < 8) {
      throw new Error("Заповніть ім'я, пошту і повідомлення");
    }
    const sql = await ready();
    const recent = await sql<{ n: number }>`
      select count(*)::int as n from contact_messages
      where email = ${data.email} and created_at > now() - interval '1 hour'
    `;
    if (Number(recent[0]?.n ?? 0) >= 5) throw new Error("Забагато повідомлень з цієї адреси");
    await sql`
      insert into contact_messages (id, name, email, message) values (${crypto.randomUUID()}, ${data.name}, ${data.email}, ${data.message})
    `;
    return { ok: true as const };
  });

export const subscribeNews = createServerFn({ method: "POST" })
  .validator((input: { email?: string; company?: string }) => ({
    email: String(input?.email ?? "").trim().toLowerCase().slice(0, 120),
    company: String(input?.company ?? ""),
  }))
  .handler(async ({ data }) => {
    if (data.company) return { ok: true as const };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error("Вкажіть коректну електронну адресу");
    const sql = await ready();
    await sql`
      insert into subscribers (id, email, active) values (${crypto.randomUUID()}, ${data.email}, true)
      on conflict (email) do update set active = true
    `;
    return { ok: true as const };
  });

export const trackView = createServerFn({ method: "POST" })
  .validator((input: { path?: string; articleId?: string; sessionId?: string; referrer?: string; device?: string; browser?: string; os?: string }) => ({
    path: String(input?.path ?? "/").slice(0, 180),
    articleId: String(input?.articleId ?? "").slice(0, 80),
    sessionId: String(input?.sessionId ?? "").slice(0, 64),
    referrer: String(input?.referrer ?? "").slice(0, 180),
    device: String(input?.device ?? "").slice(0, 20),
    browser: String(input?.browser ?? "").slice(0, 20),
    os: String(input?.os ?? "").slice(0, 20),
  }))
  .handler(async ({ data }) => {
    if (data.sessionId.length < 8) return { ok: false as const };
    const sql = await ready();
    const dup = await sql<{ id: string }>`
      select id from page_views
      where session_id = ${data.sessionId} and path = ${data.path}
        and created_at > now() - interval '30 minutes'
      limit 1
    `;
    if (dup.length > 0) return { ok: true as const };
    await sql`
      insert into page_views (id, path, article_id, session_id, referrer, device, browser, os, is_seed)
      values (
        ${crypto.randomUUID()}, ${data.path}, ${data.articleId || null}, ${data.sessionId},
        ${data.referrer}, ${data.device}, ${data.browser}, ${data.os}, false
      )
    `;
    if (data.articleId) {
      await sql`update articles set view_count = view_count + 1 where id = ${data.articleId}`;
    }
    return { ok: true as const };
  });

export const getLegalPage = createServerFn({ method: "GET" })
  .validator((input: { key?: string }) => ({ key: String(input?.key ?? "about") }))
  .handler(async ({ data }) => {
    const sql = await ready();
    const settings = await loadSettings(sql);
    const key = data.key as keyof typeof settings.pages;
    return { title: settings.siteName, body: settings.pages[key] ?? settings.pages.about, settings };
  });

export const runScheduledPublish = createServerFn({ method: "POST" })
  .validator((input: { secret?: string }) => ({ secret: String(input?.secret ?? "") }))
  .handler(async ({ data }) => {
    const sql = await ready();
    const settings = await loadSettings(sql);
    if (!settings.cronSecret || data.secret !== settings.cronSecret) {
      throw new Error("Невірний ключ планувальника");
    }
    const count = await publishDue(sql);
    return { published: count };
  });

export const ensureSite = createServerFn({ method: "GET" }).handler(async () => {
  await ready();
  return { ok: true as const };
});
