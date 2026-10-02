import { createFileRoute } from "@tanstack/react-router";
import { ready } from "@/lib/news/db.server";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const sql = await ready();
        const articles = await sql<{ slug: string; updated_at: unknown }>`
          select slug, updated_at from articles where status = 'PUBLISHED' and no_index = false order by published_at desc
        `;
        const categories = await sql<{ slug: string }>`select slug from categories where active = true`;
        const tags = await sql<{ slug: string }>`select slug from tags`;
        const authors = await sql<{ slug: string }>`select slug from authors where active = true`;
        const urls = [
          "/",
          "/news",
          "/about",
          "/contact",
          "/privacy",
          "/terms",
          "/cookies",
          ...articles.map((item) => `/news/${item.slug}`),
          ...categories.map((item) => `/category/${item.slug}`),
          ...tags.map((item) => `/tag/${item.slug}`),
          ...authors.map((item) => `/author/${item.slug}`),
        ];
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((path) => `  <url><loc>${origin}${path}</loc></url>`)
          .join("\n")}\n</urlset>`;
        return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
      },
    },
  },
});
