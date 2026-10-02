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
        const headers = new Headers({ location: "/admin" });
        const cookies = typeof result.headers.getSetCookie === "function" ? result.headers.getSetCookie() : [];
        for (const cookie of cookies) headers.append("set-cookie", cookie);
        if (cookies.length === 0) {
          const single = result.headers.get("set-cookie");
          if (single) headers.append("set-cookie", single);
        }
        return new Response(null, { status: 303, headers });
      },
    },
  },
});
