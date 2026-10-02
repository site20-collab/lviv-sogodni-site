import { createFileRoute } from "@tanstack/react-router";
import { ready } from "@/lib/news/db.server";
import { escapeXml } from "@/lib/news/richtext";

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const sql = await ready();
        const rows = await sql<{ title: string; slug: string; excerpt: string; published_at: unknown }>`
          select title, slug, excerpt, published_at from articles
          where status = 'PUBLISHED' and no_index = false
          order by published_at desc nulls last
          limit 30
        `;
        const items = rows
          .map((row) => {
            const link = `${origin}/news/${row.slug}`;
            const date = row.published_at ? new Date(String(row.published_at)).toUTCString() : new Date().toUTCString();
            return `<item><title>${escapeXml(row.title)}</title><link>${link}</link><guid>${link}</guid><description>${escapeXml(row.excerpt)}</description><pubDate>${date}</pubDate></item>`;
          })
          .join("");
        const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Львів Сьогодні</title><link>${origin}</link><description>Новини Львова та області</description>${items}</channel></rss>`;
        return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
      },
    },
  },
});
