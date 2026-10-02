import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

export const Route = createFileRoute("/api/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const email = String(form.get("email") ?? "").trim();
        const password = String(form.get("password") ?? "");
        const failed = new Response(null, { status: 303, headers: { location: "/admin/login?error=1" } });
        if (!email || !password) return failed;
        const result = await auth.api.signInEmail({
          body: { email, password },
          headers: request.headers,
          asResponse: true,
        });
        if (!result.ok) return failed;
        const payload = (await result.json()) as { user?: { id?: string; email?: string; name?: string } };
        const headers = new Headers({ location: "/admin" });
        const cookies = typeof result.headers.getSetCookie === "function" ? result.headers.getSetCookie() : [];
        for (const cookie of cookies) headers.append("set-cookie", cookie);
        if (cookies.length === 0) {
          const single = result.headers.get("set-cookie");
          if (single) headers.append("set-cookie", single);
        }
        const userId = payload.user?.id;
        if (userId) {
          const { ready } = await import("@/lib/news/db.server");
          const { sealDesk, deskSetCookie } = await import("@/lib/news/desk.server");
          const sql = await ready();
          const name = payload.user?.name || "Денис";
          await sql`
            insert into staff (user_id, role, display_name)
            values (${userId}, 'SUPER_ADMIN', ${name})
            on conflict (user_id) do nothing
          `;
          headers.append("set-cookie", deskSetCookie(sealDesk(userId)));
        }
        return new Response(null, { status: 303, headers });
      },
    },
  },
});
