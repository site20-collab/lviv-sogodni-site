import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { ready } from "@/lib/news/db.server";

const OWNER = "denys20smm@gmail.com";

export const Route = createFileRoute("/api/staff")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) return Response.json({ staff: null, error: "Unauthorized" }, { status: 401 });
        const sql = await ready();
        const userId = session.user.id;
        const email = session.user.email ?? "";
        const name = session.user.name || "Денис";
        if (email.toLowerCase() === OWNER) {
          await sql`
            insert into staff (user_id, role, display_name)
            values (${userId}, 'SUPER_ADMIN', ${name})
            on conflict (user_id) do nothing
          `;
        }
        const rows = await sql<{ role: string; display_name: string | null; email: string; name: string }>`
          select s.role, s.display_name, u.email, u.name
          from staff s join "user" u on u.id = s.user_id
          where s.user_id = ${userId}
        `;
        const row = rows[0];
        if (!row) return Response.json({ staff: null, error: "Немає доступу" }, { status: 403 });
        return Response.json({
          staff: {
            userId,
            role: row.role,
            name: row.display_name || row.name,
            email: row.email,
          },
        });
      },
    },
  },
});
