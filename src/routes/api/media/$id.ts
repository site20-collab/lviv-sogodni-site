import { createFileRoute } from "@tanstack/react-router";
import { ready } from "@/lib/news/db.server";

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const sql = await ready();
        const rows = await sql<{ mime: string; data_base64: string }>`
          select mime, data_base64 from media where id = ${params.id}
        `;
        const row = rows[0];
        if (!row) return new Response("Не знайдено", { status: 404 });
        const bytes = Uint8Array.from(Buffer.from(row.data_base64, "base64"));
        return new Response(bytes, {
          headers: {
            "Content-Type": row.mime,
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
