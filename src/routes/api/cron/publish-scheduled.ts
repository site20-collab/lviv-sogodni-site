import { createFileRoute } from "@tanstack/react-router";
import { loadSettings, publishDue, ready } from "@/lib/news/db.server";

async function handle(request: Request) {
  const sql = await ready();
  const settings = await loadSettings(sql);
  const url = new URL(request.url);
  const secret = request.headers.get("x-cron-secret") ?? url.searchParams.get("secret") ?? "";
  if (!settings.cronSecret || secret !== settings.cronSecret) {
    return new Response("Заборонено", { status: 403 });
  }
  const published = await publishDue(sql);
  return Response.json({ published });
}

export const Route = createFileRoute("/api/cron/publish-scheduled")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
