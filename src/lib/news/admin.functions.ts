import { createServerFn } from "@tanstack/react-start";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Sql } from "@/lib/db";
import { galleryOf, loadSettings, mapCard, ready, selectCards } from "./db.server";
import { resolveStatus, type SaveAction } from "./domain";
import { asJson, isoOf } from "./format";
import { can } from "./permissions";
import { slugify } from "./slug";
import type { Block, GalleryItem, StaffInfo, StaffRole } from "./types";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

async function staffOf(sql: Sql, userId: string): Promise<StaffInfo | null> {
  const rows = await sql<{ role: StaffRole; display_name: string | null; email: string; name: string }>`
    select s.role, s.display_name, u.email, u.name
    from staff s join "user" u on u.id = s.user_id
    where s.user_id = ${userId}
  `;
  const row = rows[0];
  if (!row) return null;
  return { userId, role: row.role, name: row.display_name || row.name, email: row.email };
}

async function requirePerm(sql: Sql, userId: string, perm: string): Promise<StaffInfo> {
  const staff = await staffOf(sql, userId);
  if (!staff) throw new Error("Немає доступу до редакції");
  if (!can(staff.role, perm)) throw new Error("Недостатньо прав для цієї дії");
  return staff;
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function cleanBlocks(input: unknown): Block[] {
  if (!Array.isArray(input)) return [];
  const out: Block[] = [];
  for (const raw of input.slice(0, 80)) {
    if (!raw || typeof raw !== "object") continue;
    const block = raw as Record<string, unknown>;
    const type = String(block.type);
    const bid = cleanText(block.id, 40) || crypto.randomUUID();
    if (type === "p" || type === "h2" || type === "h3") {
      out.push({ id: bid, type, text: cleanText(block.text, 8000) });
    } else if (type === "quote") {
      out.push({ id: bid, type, text: cleanText(block.text, 2000), cite: cleanText(block.cite, 160) });
    } else if (type === "ul" || type === "ol") {
      const items = Array.isArray(block.items) ? block.items.map((item) => cleanText(item, 500)).slice(0, 30) : [];
      out.push({ id: bid, type, items });
    } else if (type === "image") {
      out.push({
        id: bid,
        type,
        url: cleanText(block.url, 400),
        alt: cleanText(block.alt, 200),
        caption: cleanText(block.caption, 300),
      });
    } else if (type === "video") {
      out.push({ id: bid, type, url: cleanText(block.url, 400), caption: cleanText(block.caption, 300) });
    } else if (type === "table") {
      const rows = Array.isArray(block.rows)
        ? block.rows.slice(0, 12).map((row) => (Array.isArray(row) ? row.slice(0, 6).map((cell) => cleanText(cell, 200)) : []))
        : [];
      out.push({ id: bid, type, rows });
    } else if (type === "hr") {
      out.push({ id: bid, type: "hr" });
    }
  }
  return out;
}

function cleanGallery(input: unknown): GalleryItem[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 12).map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return { url: cleanText(row.url, 400), alt: cleanText(row.alt, 200), caption: cleanText(row.caption, 300) };
  }).filter((item) => item.url);
}

type ArticlePayload = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: Block[];
  gallery: GalleryItem[];
  categoryId: string;
  tagIds: string[];
  authorId: string;
  coverUrl: string;
  coverAlt: string;
  coverCaption: string;
  source: string;
  sourceUrl: string;
  location: string;
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  noIndex: boolean;
  featured: boolean;
  breaking: boolean;
  pinned: boolean;
  scheduledAt: string;
  action: SaveAction;
};

function parseArticle(input: unknown): ArticlePayload {
  const raw = (input ?? {}) as Record<string, unknown>;
  const action = String(raw.action ?? "draft") as SaveAction;
  const allowed: SaveAction[] = ["draft", "pending", "publish", "schedule", "autosave"];
  return {
    id: cleanText(raw.id, 80),
    title: cleanText(raw.title, 240),
    slug: slugify(cleanText(raw.slug, 120) || cleanText(raw.title, 240)),
    excerpt: cleanText(raw.excerpt, 500),
    content: cleanBlocks(raw.content),
    gallery: cleanGallery(raw.gallery),
    categoryId: cleanText(raw.categoryId, 80),
    tagIds: Array.isArray(raw.tagIds) ? raw.tagIds.map((tag) => cleanText(tag, 80)).filter(Boolean).slice(0, 20) : [],
    authorId: cleanText(raw.authorId, 80),
    coverUrl: cleanText(raw.coverUrl, 400),
    coverAlt: cleanText(raw.coverAlt, 200),
    coverCaption: cleanText(raw.coverCaption, 300),
    source: cleanText(raw.source, 160),
    sourceUrl: cleanText(raw.sourceUrl, 300),
    location: cleanText(raw.location, 120),
    seoTitle: cleanText(raw.seoTitle, 240),
    seoDescription: cleanText(raw.seoDescription, 320),
    ogImageUrl: cleanText(raw.ogImageUrl, 400),
    canonicalUrl: cleanText(raw.canonicalUrl, 300),
    noIndex: Boolean(raw.noIndex),
    featured: Boolean(raw.featured),
    breaking: Boolean(raw.breaking),
    pinned: Boolean(raw.pinned),
    scheduledAt: cleanText(raw.scheduledAt, 40),
    action: allowed.includes(action) ? action : "draft",
  };
}

export const getSessionStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await ready();
    return staffOf(sql, context.userId);
  });

export const getBadges = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "articles").catch(async () => {
      const staff = await staffOf(sql, context.userId);
      if (!staff) throw new Error("Немає доступу до редакції");
    });
    const staff = await staffOf(sql, context.userId);
    if (!staff) throw new Error("Немає доступу до редакції");
    const rows = await sql<{ comments: number; messages: number; pending: number; scheduled: number }>`
      select
        (select count(*)::int from comments where status = 'PENDING') as comments,
        (select count(*)::int from contact_messages where is_read = false) as messages,
        (select count(*)::int from articles where status = 'PENDING') as pending,
        (select count(*)::int from articles where status = 'SCHEDULED') as scheduled
    `;
    return rows[0] ?? { comments: 0, messages: 0, pending: 0, scheduled: 0 };
  });

export const adminListArticles = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { q?: string; status?: string; categoryId?: string; authorId?: string; page?: number }) => ({
    q: cleanText(input?.q, 80),
    status: cleanText(input?.status, 20),
    categoryId: cleanText(input?.categoryId, 80),
    authorId: cleanText(input?.authorId, 80),
    page: Math.max(1, Number(input?.page) || 1),
  }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    const staff = await requirePerm(sql, context.userId, "articles");
    const clauses = ["1=1"];
    const params: unknown[] = [];
    if (staff.role === "AUTHOR") {
      params.push(staff.userId);
      clauses.push(`a.created_by = $${params.length}`);
    }
    if (data.status) {
      params.push(data.status);
      clauses.push(`a.status = $${params.length}`);
    }
    if (data.categoryId) {
      params.push(data.categoryId);
      clauses.push(`a.category_id = $${params.length}`);
    }
    if (data.authorId) {
      params.push(data.authorId);
      clauses.push(`a.author_id = $${params.length}`);
    }
    if (data.q) {
      params.push(`%${data.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
      clauses.push(`(a.title ilike $${params.length} escape '\\' or a.excerpt ilike $${params.length} escape '\\')`);
    }
    const where = `where ${clauses.join(" and ")}`;
    const pageSize = 20;
    const offset = (data.page - 1) * pageSize;
    const totalRows = await sql.query<{ n: number }>(`select count(*)::int as n from articles a ${where}`, params);
    const items = await selectCards(sql, where, params, `order by a.updated_at desc limit ${pageSize} offset ${offset}`);
    return { items, total: Number(totalRows[0]?.n ?? 0), page: data.page, pageSize };
  });

export const adminGetArticle = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string }) => ({ id: cleanText(input?.id, 80) }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    const staff = await requirePerm(sql, context.userId, "articles");
    const rows = await sql<Record<string, unknown>>`select * from articles where id = ${data.id}`;
    const row = rows[0];
    if (!row) return null;
    if (staff.role === "AUTHOR" && row.created_by !== staff.userId) throw new Error("Можна відкривати лише власні матеріали");
    const tagRows = await sql<{ tag_id: string }>`select tag_id from article_tags where article_id = ${data.id}`;
    const versions = await sql<{ id: string; version: number; title: string; editor_name: string | null; created_at: unknown }>`
      select id, version, title, editor_name, created_at from article_versions
      where article_id = ${data.id} order by version desc limit 20
    `;
    return {
      id: String(row.id),
      title: String(row.title),
      slug: String(row.slug),
      excerpt: String(row.excerpt ?? ""),
      content: cleanBlocks(asJson(row.autosave, null) ? asJson<Record<string, unknown>>(row.autosave, {}).content : row.content),
      savedContent: cleanBlocks(row.content),
      gallery: galleryOf(row.gallery),
      status: String(row.status),
      featured: Boolean(row.featured),
      breaking: Boolean(row.breaking),
      pinned: Boolean(row.pinned),
      coverUrl: String(row.cover_url ?? ""),
      coverAlt: String(row.cover_alt ?? ""),
      coverCaption: String(row.cover_caption ?? ""),
      categoryId: String(row.category_id ?? ""),
      authorId: String(row.author_id ?? ""),
      tagIds: tagRows.map((tag) => tag.tag_id),
      source: String(row.source ?? ""),
      sourceUrl: String(row.source_url ?? ""),
      location: String(row.location ?? ""),
      seoTitle: String(row.seo_title ?? ""),
      seoDescription: String(row.seo_description ?? ""),
      ogImageUrl: String(row.og_image_url ?? ""),
      canonicalUrl: String(row.canonical_url ?? ""),
      noIndex: Boolean(row.no_index),
      publishedAt: isoOf(row.published_at),
      scheduledAt: isoOf(row.scheduled_at),
      previewToken: String(row.preview_token ?? ""),
      autosaveAt: isoOf(row.autosave_at),
      hasAutosave: Boolean(row.autosave),
      viewCount: Number(row.view_count ?? 0),
      versions: versions.map((version) => ({
        id: version.id,
        version: version.version,
        title: version.title,
        editorName: version.editor_name,
        createdAt: isoOf(version.created_at),
      })),
    };
  });

async function writeVersion(sql: Sql, articleId: string, title: string, snapshot: unknown, staff: StaffInfo) {
  const rows = await sql<{ n: number }>`select coalesce(max(version), 0)::int as n from article_versions where article_id = ${articleId}`;
  const version = Number(rows[0]?.n ?? 0) + 1;
  await sql`
    insert into article_versions (id, article_id, version, title, snapshot, editor_id, editor_name)
    values (${crypto.randomUUID()}, ${articleId}, ${version}, ${title}, ${JSON.stringify(snapshot)}::jsonb, ${staff.userId}, ${staff.name})
  `;
}

export const saveArticle = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parseArticle(input))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    const staff = await requirePerm(sql, context.userId, "articles");
    if (data.title.length < 3) throw new Error("Заголовок закороткий");
    if (!data.slug) throw new Error("Вкажіть адресу матеріалу");
    const decided = resolveStatus(data.action === "autosave" ? "draft" : data.action, staff.role, data.scheduledAt || null);
    if (data.action !== "autosave" && decided.error) throw new Error(decided.error);
    if ((data.action === "publish" || data.action === "schedule") && data.coverUrl && !data.coverAlt) {
      throw new Error("Додайте alt-текст до головного зображення");
    }
    const existing = data.id
      ? (await sql<{ id: string; status: string; created_by: string | null; published_at: unknown; preview_token: string | null }>`
          select id, status, created_by, published_at, preview_token from articles where id = ${data.id}
        `)[0]
      : undefined;
    if (existing && staff.role === "AUTHOR" && existing.created_by !== staff.userId) {
      throw new Error("Можна редагувати лише власні матеріали");
    }
    const dup = await sql<{ id: string }>`select id from articles where slug = ${data.slug} and id <> ${data.id || ""}`;
    if (dup.length > 0) throw new Error("Така адреса вже зайнята");

    const articleId = existing?.id ?? (data.id || crypto.randomUUID());
    const snapshot = {
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      gallery: data.gallery,
      coverUrl: data.coverUrl,
      coverAlt: data.coverAlt,
    };

    if (data.action === "autosave" && existing && ["PUBLISHED", "SCHEDULED", "ARCHIVED"].includes(existing.status)) {
      await sql`
        update articles set autosave = ${JSON.stringify(snapshot)}::jsonb, autosave_at = now() where id = ${articleId}
      `;
      return { id: articleId, status: existing.status, savedAt: new Date().toISOString(), previewToken: existing.preview_token };
    }

    let status = existing && data.action === "autosave" ? existing.status : decided.status;
    if (!existing && data.action === "autosave") status = "DRAFT";
    const publishedAt =
      status === "PUBLISHED"
        ? isoOf(existing?.published_at) ?? new Date().toISOString()
        : status === "SCHEDULED"
          ? null
          : isoOf(existing?.published_at);
    const token = existing?.preview_token || crypto.randomUUID().replace(/-/g, "");

    if (!existing) {
      await sql`
        insert into articles (
          id, title, slug, excerpt, content, status, featured, breaking, pinned,
          cover_url, cover_alt, cover_caption, gallery, author_id, category_id,
          source, source_url, location, seo_title, seo_description, og_image_url,
          canonical_url, no_index, published_at, scheduled_at, preview_token,
          created_by, updated_by, autosave, autosave_at
        ) values (
          ${articleId}, ${data.title}, ${data.slug}, ${data.excerpt}, ${JSON.stringify(data.content)}::jsonb,
          ${status}, ${data.featured}, ${data.breaking}, ${data.pinned}, ${data.coverUrl}, ${data.coverAlt},
          ${data.coverCaption}, ${JSON.stringify(data.gallery)}::jsonb, ${data.authorId || null}, ${data.categoryId || null},
          ${data.source}, ${data.sourceUrl}, ${data.location}, ${data.seoTitle}, ${data.seoDescription}, ${data.ogImageUrl},
          ${data.canonicalUrl}, ${data.noIndex}, ${publishedAt}, ${status === "SCHEDULED" ? data.scheduledAt : null}, ${token},
          ${staff.userId}, ${staff.userId}, null, null
        )
      `;
    } else {
      await sql`
        update articles set
          title = ${data.title}, slug = ${data.slug}, excerpt = ${data.excerpt},
          content = ${JSON.stringify(data.content)}::jsonb, status = ${status},
          featured = ${data.featured}, breaking = ${data.breaking}, pinned = ${data.pinned},
          cover_url = ${data.coverUrl}, cover_alt = ${data.coverAlt}, cover_caption = ${data.coverCaption},
          gallery = ${JSON.stringify(data.gallery)}::jsonb, author_id = ${data.authorId || null},
          category_id = ${data.categoryId || null}, source = ${data.source}, source_url = ${data.sourceUrl},
          location = ${data.location}, seo_title = ${data.seoTitle}, seo_description = ${data.seoDescription},
          og_image_url = ${data.ogImageUrl}, canonical_url = ${data.canonicalUrl}, no_index = ${data.noIndex},
          published_at = ${status === "PUBLISHED" ? publishedAt : status === "SCHEDULED" ? null : publishedAt},
          scheduled_at = ${status === "SCHEDULED" ? data.scheduledAt : null},
          updated_by = ${staff.userId}, updated_at = now(), autosave = null, autosave_at = null
        where id = ${articleId}
      `;
    }
    if (data.featured) {
      await sql`update articles set featured = false where featured = true and id <> ${articleId}`;
    }
    await sql`delete from article_tags where article_id = ${articleId}`;
    for (const tagId of data.tagIds) {
      await sql`insert into article_tags (article_id, tag_id) values (${articleId}, ${tagId}) on conflict do nothing`;
    }
    if (data.action !== "autosave") await writeVersion(sql, articleId, data.title, snapshot, staff);
    return { id: articleId, status, savedAt: new Date().toISOString(), slug: data.slug, previewToken: token };
  });

export const setArticleStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string; status?: string }) => ({
    id: cleanText(input?.id, 80),
    status: cleanText(input?.status, 20),
  }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    const staff = await requirePerm(sql, context.userId, "articles");
    const allowed = ["DRAFT", "PENDING", "PUBLISHED", "ARCHIVED"];
    if (!allowed.includes(data.status)) throw new Error("Невідомий статус");
    if ((data.status === "PUBLISHED" || data.status === "ARCHIVED") && !can(staff.role, "publish")) {
      throw new Error("Недостатньо прав для публікації");
    }
    const rows = await sql<{ created_by: string | null; cover_url: string | null; cover_alt: string | null }>`
      select created_by, cover_url, cover_alt from articles where id = ${data.id}
    `;
    const row = rows[0];
    if (!row) throw new Error("Матеріал не знайдено");
    if (staff.role === "AUTHOR" && row.created_by !== staff.userId) throw new Error("Можна змінювати лише власні матеріали");
    if (data.status === "PUBLISHED" && row.cover_url && !row.cover_alt) throw new Error("Додайте alt-текст до головного зображення");
    await sql`
      update articles set
        status = ${data.status},
        published_at = case when ${data.status} = 'PUBLISHED' then coalesce(published_at, now()) else published_at end,
        updated_at = now(), updated_by = ${staff.userId}
      where id = ${data.id}
    `;
    return { ok: true as const };
  });

export const deleteArticle = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string }) => ({ id: cleanText(input?.id, 80) }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    const staff = await requirePerm(sql, context.userId, "articles");
    if (staff.role === "AUTHOR") {
      const rows = await sql<{ created_by: string | null }>`select created_by from articles where id = ${data.id}`;
      if (rows[0]?.created_by !== staff.userId) throw new Error("Можна видаляти лише власні матеріали");
    }
    if (!can(staff.role, "publish") && staff.role !== "AUTHOR" && staff.role !== "SUPER_ADMIN") {
      throw new Error("Недостатньо прав");
    }
    await sql`delete from articles where id = ${data.id}`;
    return { ok: true as const };
  });

export const duplicateArticle = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string }) => ({ id: cleanText(input?.id, 80) }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    const staff = await requirePerm(sql, context.userId, "articles");
    const rows = await sql<Record<string, unknown>>`select * from articles where id = ${data.id}`;
    const row = rows[0];
    if (!row) throw new Error("Матеріал не знайдено");
    const newId = crypto.randomUUID();
    const slug = `${String(row.slug)}-kopiia`.slice(0, 90);
    await sql`
      insert into articles (
        id, title, slug, excerpt, content, status, featured, breaking, pinned, cover_url, cover_alt,
        cover_caption, gallery, author_id, category_id, source, source_url, location, seo_title,
        seo_description, og_image_url, canonical_url, no_index, preview_token, created_by, updated_by
      ) values (
        ${newId}, ${String(row.title) + " (копія)"}, ${slug}, ${String(row.excerpt ?? "")},
        ${JSON.stringify(row.content ?? [])}::jsonb, 'DRAFT', false, false, false,
        ${row.cover_url ?? ""}, ${row.cover_alt ?? ""}, ${row.cover_caption ?? ""},
        ${JSON.stringify(row.gallery ?? [])}::jsonb, ${row.author_id ?? null}, ${row.category_id ?? null},
        ${row.source ?? ""}, ${row.source_url ?? ""}, ${row.location ?? ""}, ${row.seo_title ?? ""},
        ${row.seo_description ?? ""}, ${row.og_image_url ?? ""}, ${""}, ${Boolean(row.no_index)},
        ${crypto.randomUUID().replace(/-/g, "")}, ${staff.userId}, ${staff.userId}
      )
    `;
    const tags = await sql<{ tag_id: string }>`select tag_id from article_tags where article_id = ${data.id}`;
    for (const tag of tags) {
      await sql`insert into article_tags (article_id, tag_id) values (${newId}, ${tag.tag_id}) on conflict do nothing`;
    }
    return { id: newId };
  });

export const bulkArticles = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { ids?: string[]; action?: string }) => ({
    ids: Array.isArray(input?.ids) ? input.ids.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 50) : [],
    action: cleanText(input?.action, 20),
  }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    const staff = await requirePerm(sql, context.userId, "publish");
    if (data.ids.length === 0) return { ok: true as const };
    if (data.action === "delete") {
      for (const articleId of data.ids) await sql`delete from articles where id = ${articleId}`;
    } else if (data.action === "publish") {
      for (const articleId of data.ids) {
        await sql`update articles set status = 'PUBLISHED', published_at = coalesce(published_at, now()), updated_at = now(), updated_by = ${staff.userId} where id = ${articleId}`;
      }
    } else if (data.action === "archive") {
      for (const articleId of data.ids) {
        await sql`update articles set status = 'ARCHIVED', updated_at = now(), updated_by = ${staff.userId} where id = ${articleId}`;
      }
    } else if (data.action === "unpublish") {
      for (const articleId of data.ids) {
        await sql`update articles set status = 'DRAFT', updated_at = now(), updated_by = ${staff.userId} where id = ${articleId}`;
      }
    } else throw new Error("Невідома дія");
    return { ok: true as const };
  });

export const restoreVersion = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { articleId?: string; versionId?: string }) => ({
    articleId: cleanText(input?.articleId, 80),
    versionId: cleanText(input?.versionId, 80),
  }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    const staff = await requirePerm(sql, context.userId, "articles");
    const rows = await sql<{ snapshot: unknown; title: string }>`
      select snapshot, title from article_versions where id = ${data.versionId} and article_id = ${data.articleId}
    `;
    const version = rows[0];
    if (!version) throw new Error("Версію не знайдено");
    const snap = asJson<Record<string, unknown>>(version.snapshot, {});
    await sql`
      update articles set title = ${cleanText(snap.title, 240) || version.title},
        excerpt = ${cleanText(snap.excerpt, 500)},
        content = ${JSON.stringify(cleanBlocks(snap.content))}::jsonb,
        updated_at = now(), updated_by = ${staff.userId}
      where id = ${data.articleId}
    `;
    await writeVersion(sql, data.articleId, version.title, snap, staff);
    return { ok: true as const };
  });

export const adminRefs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "articles");
    const cats = await sql<{ id: string; name: string; slug: string }>`select id, name, slug from categories where active = true order by sort_order, name`;
    const tagRows = await sql<{ id: string; name: string }>`select id, name from tags order by name`;
    const authorRows = await sql<{ id: string; name: string }>`select id, name from authors where active = true order by name`;
    return { categories: cats, tags: tagRows, authors: authorRows };
  });

export const listCategories = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "categories");
    const rows = await sql<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      seo_title: string | null;
      seo_description: string | null;
      sort_order: number;
      active: boolean;
      show_in_nav: boolean;
    }>`
      select id, name, slug, description, seo_title, seo_description, sort_order, active, show_in_nav
      from categories order by sort_order, name
    `;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? "",
      seo_title: row.seo_title,
      seo_description: row.seo_description,
      sort_order: Number(row.sort_order) || 0,
      active: Boolean(row.active),
      show_in_nav: Boolean(row.show_in_nav),
    }));
  });

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Record<string, unknown>) => input)
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "categories");
    const idValue = cleanText(data.id, 80) || crypto.randomUUID();
    const name = cleanText(data.name, 80);
    const slug = slugify(cleanText(data.slug, 80) || name);
    if (name.length < 2 || !slug) throw new Error("Вкажіть назву рубрики");
    const existing = await sql<{ id: string }>`select id from categories where id = ${idValue}`;
    if (existing.length === 0) {
      await sql`
        insert into categories (id, name, slug, description, seo_title, seo_description, sort_order, active, show_in_nav)
        values (${idValue}, ${name}, ${slug}, ${cleanText(data.description, 400)}, ${cleanText(data.seoTitle, 160)}, ${cleanText(data.seoDescription, 300)}, ${Number(data.sortOrder) || 0}, ${data.active !== false}, ${Boolean(data.showInNav)})
      `;
    } else {
      await sql`
        update categories set name = ${name}, slug = ${slug}, description = ${cleanText(data.description, 400)},
          seo_title = ${cleanText(data.seoTitle, 160)}, seo_description = ${cleanText(data.seoDescription, 300)},
          sort_order = ${Number(data.sortOrder) || 0}, active = ${data.active !== false}, show_in_nav = ${Boolean(data.showInNav)}
        where id = ${idValue}
      `;
    }
    return { id: idValue };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string }) => ({ id: cleanText(input?.id, 80) }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "categories");
    await sql`delete from categories where id = ${data.id}`;
    return { ok: true as const };
  });

export const listTags = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "tags");
    const rows = await sql<{ id: string; name: string; slug: string; description: string | null }>`
      select id, name, slug, description from tags order by name
    `;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? "",
    }));
  });

export const saveTag = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Record<string, unknown>) => input)
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "tags");
    const idValue = cleanText(data.id, 80) || crypto.randomUUID();
    const name = cleanText(data.name, 60);
    const slug = slugify(cleanText(data.slug, 80) || name);
    if (name.length < 2 || !slug) throw new Error("Вкажіть назву тегу");
    const existing = await sql`select id from tags where id = ${idValue}`;
    if (existing.length === 0) {
      await sql`insert into tags (id, name, slug, description) values (${idValue}, ${name}, ${slug}, ${cleanText(data.description, 300)})`;
    } else {
      await sql`update tags set name = ${name}, slug = ${slug}, description = ${cleanText(data.description, 300)} where id = ${idValue}`;
    }
    return { id: idValue };
  });

export const deleteTag = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string }) => ({ id: cleanText(input?.id, 80) }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "tags");
    await sql`delete from tags where id = ${data.id}`;
    return { ok: true as const };
  });

export const listAuthors = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await ready();
    const staff = await staffOf(sql, context.userId);
    if (!staff || (!can(staff.role, "authors") && !can(staff.role, "articles"))) throw new Error("Немає доступу");
    const rows = await sql<{
      id: string;
      name: string;
      slug: string;
      email: string | null;
      bio: string | null;
      avatar_url: string | null;
      active: boolean;
    }>`select id, name, slug, email, bio, avatar_url, active from authors order by name`;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      email: row.email,
      bio: row.bio ?? "",
      avatar_url: row.avatar_url,
      active: Boolean(row.active),
    }));
  });

export const saveAuthor = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Record<string, unknown>) => input)
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "authors");
    const idValue = cleanText(data.id, 80) || crypto.randomUUID();
    const name = cleanText(data.name, 80);
    const slug = slugify(cleanText(data.slug, 80) || name);
    if (name.length < 2 || !slug) throw new Error("Вкажіть ім'я автора");
    const existing = await sql`select id from authors where id = ${idValue}`;
    if (existing.length === 0) {
      await sql`
        insert into authors (id, slug, name, email, bio, avatar_url, active)
        values (${idValue}, ${slug}, ${name}, ${cleanText(data.email, 120)}, ${cleanText(data.bio, 800)}, ${cleanText(data.avatarUrl, 300)}, ${data.active !== false})
      `;
    } else {
      await sql`
        update authors set slug = ${slug}, name = ${name}, email = ${cleanText(data.email, 120)},
          bio = ${cleanText(data.bio, 800)}, avatar_url = ${cleanText(data.avatarUrl, 300)}, active = ${data.active !== false}
        where id = ${idValue}
      `;
    }
    return { id: idValue };
  });

export const deleteAuthor = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string }) => ({ id: cleanText(input?.id, 80) }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "authors");
    await sql`delete from authors where id = ${data.id}`;
    return { ok: true as const };
  });

type MediaRow = {
  id: string;
  filename: string;
  original_name: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  caption: string | null;
  created_at: unknown;
};

function mapMedia(rows: MediaRow[]) {
  return rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    original_name: row.original_name,
    mime: row.mime,
    size: Number(row.size) || 0,
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    alt: row.alt ?? "",
    caption: row.caption ?? "",
    created_at: isoOf(row.created_at) ?? "",
  }));
}

export const listMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { q?: string }) => ({ q: cleanText(input?.q, 80) }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "media");
    if (!data.q) {
      const rows = await sql<MediaRow>`
        select id, filename, original_name, mime, size, width, height, alt, caption, created_at
        from media order by created_at desc limit 60
      `;
      return mapMedia(rows);
    }
    const pattern = `%${data.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    const rows = await sql<MediaRow>`
      select id, filename, original_name, mime, size, width, height, alt, caption, created_at
      from media
      where original_name ilike ${pattern} escape '\\' or alt ilike ${pattern} escape '\\'
      order by created_at desc limit 60
    `;
    return mapMedia(rows);
  });

export const uploadMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { filename?: string; mime?: string; dataBase64?: string; alt?: string; width?: number; height?: number }) => ({
    filename: cleanText(input?.filename, 120),
    mime: cleanText(input?.mime, 40),
    dataBase64: String(input?.dataBase64 ?? ""),
    alt: cleanText(input?.alt, 200),
    width: Number(input?.width) || null,
    height: Number(input?.height) || null,
  }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    const staff = await requirePerm(sql, context.userId, "media");
    if (!ALLOWED_MIME.has(data.mime)) throw new Error("Дозволені лише JPG, PNG, WEBP і AVIF");
    if (data.dataBase64.length < 32 || data.dataBase64.length > 2_200_000) throw new Error("Файл завеликий або порожній. Ліміт близько 1,5 МБ");
    if (!/^[A-Za-z0-9+/=\s]+$/.test(data.dataBase64.slice(0, 80))) throw new Error("Пошкоджений файл");
    const mediaId = crypto.randomUUID();
    await sql`
      insert into media (id, filename, original_name, mime, size, width, height, alt, caption, data_base64, uploaded_by)
      values (
        ${mediaId}, ${mediaId}, ${data.filename || "image"}, ${data.mime}, ${Math.round((data.dataBase64.length * 3) / 4)},
        ${data.width}, ${data.height}, ${data.alt}, '', ${data.dataBase64}, ${staff.userId}
      )
    `;
    return { id: mediaId, url: `/api/media/${mediaId}`, alt: data.alt };
  });

export const updateMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string; alt?: string; caption?: string }) => ({
    id: cleanText(input?.id, 80),
    alt: cleanText(input?.alt, 200),
    caption: cleanText(input?.caption, 300),
  }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "media");
    await sql`update media set alt = ${data.alt}, caption = ${data.caption} where id = ${data.id}`;
    return { ok: true as const };
  });

export const deleteMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string }) => ({ id: cleanText(input?.id, 80) }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "media");
    await sql`delete from media where id = ${data.id}`;
    return { ok: true as const };
  });

type CommentRow = {
  id: string;
  author_name: string;
  author_email: string;
  body: string;
  status: string;
  created_at: unknown;
  title: string | null;
  slug: string | null;
};

function mapComments(rows: CommentRow[]) {
  return rows.map((row) => ({
    id: row.id,
    author_name: row.author_name,
    author_email: row.author_email,
    body: row.body,
    status: row.status,
    created_at: isoOf(row.created_at) ?? "",
    title: row.title,
    slug: row.slug,
  }));
}

export const listComments = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { status?: string }) => ({ status: cleanText(input?.status, 20) }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "comments");
    if (data.status) {
      const rows = await sql<CommentRow>`
        select c.id, c.author_name, c.author_email, c.body, c.status, c.created_at, a.title, a.slug
        from comments c left join articles a on a.id = c.article_id
        where c.status = ${data.status}
        order by c.created_at desc limit 100
      `;
      return mapComments(rows);
    }
    const rows = await sql<CommentRow>`
      select c.id, c.author_name, c.author_email, c.body, c.status, c.created_at, a.title, a.slug
      from comments c left join articles a on a.id = c.article_id
      order by c.created_at desc limit 100
    `;
    return mapComments(rows);
  });

export const moderateComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string; status?: string }) => ({
    id: cleanText(input?.id, 80),
    status: cleanText(input?.status, 20),
  }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "comments");
    if (data.status === "DELETE") {
      await sql`delete from comments where id = ${data.id}`;
    } else if (["PENDING", "APPROVED", "REJECTED", "SPAM"].includes(data.status)) {
      await sql`update comments set status = ${data.status} where id = ${data.id}`;
    } else throw new Error("Невідома дія");
    return { ok: true as const };
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "messages");
    const rows = await sql<{ id: string; name: string; email: string; message: string; is_read: boolean; created_at: unknown }>`
      select id, name, email, message, is_read, created_at from contact_messages order by created_at desc limit 100
    `;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      message: row.message,
      is_read: Boolean(row.is_read),
      created_at: isoOf(row.created_at) ?? "",
    }));
  });

export const updateMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string; action?: string }) => ({
    id: cleanText(input?.id, 80),
    action: cleanText(input?.action, 20),
  }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "messages");
    if (data.action === "delete") await sql`delete from contact_messages where id = ${data.id}`;
    else await sql`update contact_messages set is_read = true where id = ${data.id}`;
    return { ok: true as const };
  });

export const listSubscribers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "subscribers");
    const rows = await sql<{ id: string; email: string; active: boolean; created_at: unknown }>`
      select id, email, active, created_at from subscribers order by created_at desc limit 200
    `;
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      active: Boolean(row.active),
      created_at: isoOf(row.created_at) ?? "",
    }));
  });

export const updateSubscriber = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string; action?: string }) => ({
    id: cleanText(input?.id, 80),
    action: cleanText(input?.action, 20),
  }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "subscribers");
    if (data.action === "delete") await sql`delete from subscribers where id = ${data.id}`;
    else await sql`update subscribers set active = not active where id = ${data.id}`;
    return { ok: true as const };
  });

export const listAds = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "ads");
    const rows = await sql<{
      id: string;
      name: string;
      code: string;
      placement: string;
      active: boolean;
      start_date: unknown;
      end_date: unknown;
    }>`select id, name, code, placement, active, start_date, end_date from ads order by created_at desc`;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      placement: row.placement,
      active: Boolean(row.active),
      start_date: row.start_date == null ? null : String(row.start_date).slice(0, 10),
      end_date: row.end_date == null ? null : String(row.end_date).slice(0, 10),
    }));
  });

export const saveAd = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Record<string, unknown>) => input)
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "ads");
    const idValue = cleanText(data.id, 80) || crypto.randomUUID();
    const name = cleanText(data.name, 80);
    const placement = cleanText(data.placement, 40);
    if (name.length < 2 || !placement) throw new Error("Вкажіть назву і місце блока");
    const code = String(data.code ?? "").slice(0, 8000);
    const existing = await sql`select id from ads where id = ${idValue}`;
    const start = cleanText(data.startDate, 20) || null;
    const end = cleanText(data.endDate, 20) || null;
    if (existing.length === 0) {
      await sql`
        insert into ads (id, name, code, placement, active, start_date, end_date)
        values (${idValue}, ${name}, ${code}, ${placement}, ${data.active !== false}, ${start}, ${end})
      `;
    } else {
      await sql`
        update ads set name = ${name}, code = ${code}, placement = ${placement}, active = ${data.active !== false},
          start_date = ${start}, end_date = ${end}
        where id = ${idValue}
      `;
    }
    return { id: idValue };
  });

export const deleteAd = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string }) => ({ id: cleanText(input?.id, 80) }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "ads");
    await sql`delete from ads where id = ${data.id}`;
    return { ok: true as const };
  });

export const listMenu = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "menu");
    const rows = await sql<{ id: string; label: string; url: string; target: string; active: boolean; sort_order: number }>`
      select id, label, url, target, active, sort_order from menu_items order by sort_order, label
    `;
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      url: row.url,
      target: row.target,
      active: Boolean(row.active),
      sort_order: Number(row.sort_order) || 0,
    }));
  });

export const saveMenu = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { items?: { id?: string; label?: string; url?: string; target?: string; active?: boolean }[] }) => ({
    items: Array.isArray(input?.items) ? input.items.slice(0, 30) : [],
  }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "menu");
    const ids: string[] = [];
    await sql`delete from menu_items`;
    for (let index = 0; index < data.items.length; index += 1) {
      const item = data.items[index] ?? {};
      const idValue = cleanText(item.id, 80) || crypto.randomUUID();
      const label = cleanText(item.label, 40);
      const url = cleanText(item.url, 200);
      if (!label || !url) continue;
      ids.push(idValue);
      const existing = await sql`select id from menu_items where id = ${idValue}`;
      if (existing.length === 0) {
        await sql`
          insert into menu_items (id, label, url, target, active, sort_order)
          values (${idValue}, ${label}, ${url}, ${cleanText(item.target, 10) || "_self"}, ${item.active !== false}, ${index + 1})
        `;
      } else {
        await sql`
          update menu_items set label = ${label}, url = ${url}, target = ${cleanText(item.target, 10) || "_self"},
            active = ${item.active !== false}, sort_order = ${index + 1}
          where id = ${idValue}
        `;
      }
    }
    return { ok: true as const };
  });

export const getSettingsAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await ready();
    const staff = await staffOf(sql, context.userId);
    if (!staff || (!can(staff.role, "settings") && !can(staff.role, "seo") && !can(staff.role, "homepage"))) {
      throw new Error("Немає доступу");
    }
    const settings = await loadSettings(sql);
    const sectionRows = await sql<{
      id: string;
      section_key: string;
      title: string;
      category_slug: string | null;
      sort_order: number;
      article_count: number;
      active: boolean;
    }>`
      select id, section_key, title, category_slug, sort_order, article_count, active
      from homepage_sections order by sort_order
    `;
    return {
      settings,
      sections: sectionRows.map((row) => ({
        id: row.id,
        section_key: row.section_key,
        title: row.title,
        category_slug: row.category_slug,
        sort_order: Number(row.sort_order) || 0,
        article_count: Number(row.article_count) || 4,
        active: Boolean(row.active),
      })),
      role: staff.role,
    };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Record<string, unknown>) => input)
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "settings");
    const current = await loadSettings(sql);
    const next = {
      ...current,
      ...(typeof data.settings === "object" && data.settings ? data.settings : {}),
    };
    await sql`
      insert into site_settings (key, value) values ('site', ${JSON.stringify(next)}::jsonb)
      on conflict (key) do update set value = excluded.value
    `;
    return { ok: true as const };
  });

export const saveHomepage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { sections?: Record<string, unknown>[] }) => ({
    sections: Array.isArray(input?.sections) ? input.sections.slice(0, 20) : [],
  }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "homepage");
    for (let index = 0; index < data.sections.length; index += 1) {
      const section = data.sections[index] ?? {};
      const idValue = cleanText(section.id, 80);
      if (!idValue) continue;
      await sql`
        update homepage_sections set
          title = ${cleanText(section.title, 80)},
          category_slug = ${cleanText(section.categorySlug, 80) || null},
          sort_order = ${index + 1},
          article_count = ${Math.min(12, Math.max(1, Number(section.articleCount) || 4))},
          active = ${section.active !== false}
        where id = ${idValue}
      `;
    }
    return { ok: true as const };
  });

export const getStats = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { period?: string }) => ({ period: cleanText(input?.period, 10) || "30d" }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "stats");
    const interval =
      data.period === "24h" ? "24 hours" : data.period === "7d" ? "7 days" : data.period === "90d" ? "90 days" : data.period === "365d" ? "365 days" : "30 days";
    const bucket = data.period === "24h" ? "hour" : "day";
    const counts = await sql<{
      total: number;
      published: number;
      drafts: number;
      scheduled: number;
      pending: number;
      today: number;
    }>`
      select
        count(*)::int as total,
        count(*) filter (where status = 'PUBLISHED')::int as published,
        count(*) filter (where status = 'DRAFT')::int as drafts,
        count(*) filter (where status = 'SCHEDULED')::int as scheduled,
        count(*) filter (where status = 'PENDING')::int as pending,
        count(*) filter (where status = 'PUBLISHED' and published_at::date = current_date)::int as today
      from articles
    `;
    const views = await sql.query<{ views: number; visitors: number; seed: number }>(
      `select count(*)::int as views, count(distinct session_id)::int as visitors,
              count(*) filter (where is_seed)::int as seed
       from page_views where created_at >= now() - interval '${interval}'`,
    );
    const todayViews = await sql<{ n: number }>`select count(*)::int as n from page_views where created_at::date = current_date`;
    const yViews = await sql<{ n: number }>`select count(*)::int as n from page_views where created_at::date = current_date - 1`;
    const series = await sql.query<{ bucket: string; views: number }>(
      `select to_char(date_trunc('${bucket}', created_at), '${bucket === "hour" ? "HH24:00" : "DD.MM"}') as bucket,
              count(*)::int as views
       from page_views
       where created_at >= now() - interval '${interval}'
       group by date_trunc('${bucket}', created_at)
       order by date_trunc('${bucket}', created_at)`,
    );
    const devices = await sql.query<{ name: string; n: number }>(
      `select coalesce(nullif(device, ''), 'невідомо') as name, count(*)::int as n
       from page_views where created_at >= now() - interval '${interval}' group by 1 order by n desc`,
    );
    const sources = await sql.query<{ name: string; n: number }>(
      `select case when referrer is null or referrer = '' then 'прямі' else referrer end as name, count(*)::int as n
       from page_views where created_at >= now() - interval '${interval}' group by 1 order by n desc limit 6`,
    );
    const top = await selectCards(sql, `where a.status = 'PUBLISHED'`, [], `order by a.view_count desc limit 6`);
    const topCats = await sql<{ name: string; n: number }>`
      select c.name, count(*)::int as n from articles a
      join categories c on c.id = a.category_id
      where a.status = 'PUBLISHED'
      group by c.name order by n desc limit 6
    `;
    const missingSeo = await sql<{ n: number }>`
      select count(*)::int as n from articles where status = 'PUBLISHED' and (seo_description is null or seo_description = '')
    `;
    return {
      counts: counts[0],
      views: views[0],
      todayViews: Number(todayViews[0]?.n ?? 0),
      yesterdayViews: Number(yViews[0]?.n ?? 0),
      series,
      devices,
      sources,
      top: top.map((item) => ({ title: item.title, slug: item.slug, views: item.viewCount })),
      topCats,
      missingSeo: Number(missingSeo[0]?.n ?? 0),
    };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await ready();
    await requirePerm(sql, context.userId, "users");
    return sql<{ user_id: string; role: string; display_name: string | null; email: string; name: string }>`
      select s.user_id, s.role, s.display_name, u.email, u.name
      from staff s join "user" u on u.id = s.user_id
      order by u.name
    `;
  });

export const saveUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { email?: string; name?: string; password?: string; role?: string; userId?: string }) => ({
    email: cleanText(input?.email, 120).toLowerCase(),
    name: cleanText(input?.name, 80),
    password: String(input?.password ?? ""),
    role: cleanText(input?.role, 20),
    userId: cleanText(input?.userId, 80),
  }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    const staff = await requirePerm(sql, context.userId, "users");
    const roles = ["SUPER_ADMIN", "ADMIN", "EDITOR", "AUTHOR", "MODERATOR", "ANALYST"];
    if (!roles.includes(data.role)) throw new Error("Невідома роль");
    if (data.role === "SUPER_ADMIN" && staff.role !== "SUPER_ADMIN") throw new Error("Лише суперадмін призначає цю роль");
    if (data.userId) {
      await sql`update staff set role = ${data.role}, display_name = ${data.name} where user_id = ${data.userId}`;
      await sql`update "user" set name = ${data.name}, "updatedAt" = now() where id = ${data.userId}`;
      if (data.password.length >= 10) {
        const password = await hashPassword(data.password);
        await sql`update "account" set password = ${password}, "updatedAt" = now() where "userId" = ${data.userId} and "providerId" = 'credential'`;
      }
      return { ok: true as const };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.password.length < 10 || data.name.length < 2) {
      throw new Error("Ім'я, пошта і пароль від 10 символів");
    }
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const password = await hashPassword(data.password);
    await sql`
      insert into "user" ("id","name","email","emailVerified","createdAt","updatedAt")
      values (${userId}, ${data.name}, ${data.email}, true, ${now}, ${now})
    `;
    await sql`
      insert into "account" ("id","accountId","providerId","userId","password","createdAt","updatedAt")
      values (${crypto.randomUUID()}, ${userId}, 'credential', ${userId}, ${password}, ${now}, ${now})
    `;
    await sql`insert into staff (user_id, role, display_name) values (${userId}, ${data.role}, ${data.name})`;
    return { ok: true as const };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId?: string }) => ({ userId: cleanText(input?.userId, 80) }))
  .handler(async ({ context, data }) => {
    const sql = await ready();
    const staff = await requirePerm(sql, context.userId, "users");
    if (data.userId === staff.userId) throw new Error("Не можна видалити власний обліковий запис");
    await sql`delete from staff where user_id = ${data.userId}`;
    await sql`delete from "session" where "userId" = ${data.userId}`;
    await sql`delete from "account" where "userId" = ${data.userId}`;
    await sql`delete from "user" where id = ${data.userId}`;
    return { ok: true as const };
  });

export const changeOwnPassword = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { current?: string; next?: string }) => ({
    current: String(input?.current ?? ""),
    next: String(input?.next ?? ""),
  }))
  .handler(async ({ context, data }) => {
    if (data.next.length < 10) throw new Error("Новий пароль має містити щонайменше 10 символів");
    const sql = await ready();
    const rows = await sql<{ password: string | null }>`
      select password from "account" where "userId" = ${context.userId} and "providerId" = 'credential'
    `;
    const hash = rows[0]?.password;
    if (!hash) throw new Error("Для цього входу пароль не задано");
    const ok = await verifyPassword({ hash, password: data.current });
    if (!ok) throw new Error("Поточний пароль не збігається");
    const nextHash = await hashPassword(data.next);
    await sql`update "account" set password = ${nextHash}, "updatedAt" = now() where "userId" = ${context.userId} and "providerId" = 'credential'`;
    return { ok: true as const };
  });

export const requestPasswordHelp = createServerFn({ method: "POST" })
  .validator((input: { email?: string }) => ({ email: cleanText(input?.email, 120).toLowerCase() }))
  .handler(async ({ data }) => {
    if (!data.email.includes("@")) throw new Error("Вкажіть пошту");
    const sql = await ready();
    await sql`insert into password_resets (id, email) values (${crypto.randomUUID()}, ${data.email})`;
    return { ok: true as const };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await ready();
    const staff = await staffOf(sql, context.userId);
    if (!staff) throw new Error("Немає доступу до редакції");
    if (!can(staff.role, "stats") && !can(staff.role, "articles")) throw new Error("Недостатньо прав");
    const counts = await sql<{
      total: number;
      drafts: number;
      scheduled: number;
      pending: number;
      today: number;
    }>`
      select count(*)::int as total,
        count(*) filter (where status = 'DRAFT')::int as drafts,
        count(*) filter (where status = 'SCHEDULED')::int as scheduled,
        count(*) filter (where status = 'PENDING')::int as pending,
        count(*) filter (where status = 'PUBLISHED' and published_at::date = current_date)::int as today
      from articles
    `;
    const views = await sql<{ views: number; visitors: number }>`
      select count(*)::int as views, count(distinct session_id)::int as visitors
      from page_views where created_at >= now() - interval '7 days'
    `;
    const top = await selectCards(sql, `where a.status = 'PUBLISHED'`, [], `order by a.view_count desc limit 5`);
    return {
      staff,
      counts: counts[0],
      views: views[0],
      top: top.map((item) => ({ title: item.title, slug: item.slug, views: item.viewCount })),
    };
  });
