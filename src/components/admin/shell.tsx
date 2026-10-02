import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getBadges, getSessionStaff } from "@/lib/news/admin.functions";
import { can } from "@/lib/news/permissions";
import { ROLE_LABEL } from "@/lib/news/format";
import type { StaffInfo, StaffRole } from "@/lib/news/types";

const LINKS: { href: string; label: string; perm?: string; badge?: "comments" | "messages" | "pending" | "scheduled" }[] = [
  { href: "/admin", label: "Панель", perm: "stats" },
  { href: "/admin/news", label: "Усі новини", perm: "articles" },
  { href: "/admin/news/create", label: "Створити новину", perm: "articles" },
  { href: "/admin/categories", label: "Рубрики", perm: "categories" },
  { href: "/admin/tags", label: "Теги", perm: "tags" },
  { href: "/admin/media", label: "Медіа", perm: "media" },
  { href: "/admin/authors", label: "Автори", perm: "authors" },
  { href: "/admin/users", label: "Користувачі", perm: "users" },
  { href: "/admin/comments", label: "Коментарі", perm: "comments", badge: "comments" },
  { href: "/admin/messages", label: "Повідомлення", perm: "messages", badge: "messages" },
  { href: "/admin/subscribers", label: "Підписники", perm: "subscribers" },
  { href: "/admin/menu", label: "Меню", perm: "menu" },
  { href: "/admin/ads", label: "Реклама", perm: "ads" },
  { href: "/admin/homepage", label: "Головна", perm: "homepage" },
  { href: "/admin/stats", label: "Статистика", perm: "stats" },
  { href: "/admin/seo", label: "SEO", perm: "seo" },
  { href: "/admin/settings", label: "Налаштування", perm: "settings" },
];

export function AdminGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname === "/admin/login") return <>{children}</>;
  return <RequireStaff>{children}</RequireStaff>;
}

function RequireStaff({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user, isPending } = useCurrentUserState();
  const [staff, setStaff] = useState<StaffInfo | null | undefined>(undefined);
  const [badges, setBadges] = useState({ comments: 0, messages: 0, pending: 0, scheduled: 0 });
  const [nav, setNav] = useState(false);
  useEffect(() => {
    if (!user) return;
    getSessionStaff()
      .then((value) => {
        setStaff(value);
        if (value) void getBadges().then(setBadges).catch(() => undefined);
      })
      .catch(() => setStaff(null));
  }, [user]);
  if (isPending || (user && staff === undefined)) {
    return <p className="grid min-h-screen place-items-center bg-paper text-muted">Відкриваємо редакцію…</p>;
  }
  if (!user) return <Navigate to="/admin/login" />;
  if (!staff) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-4 text-center">
        <div>
          <h1 className="font-serif text-3xl">Немає доступу</h1>
          <p className="mt-2 text-muted">Цей обліковий запис не входить до редакції.</p>
          <div className="mt-4"><UserButton /></div>
        </div>
      </main>
    );
  }
  const visible = LINKS.filter((link) => {
    if (link.href === "/admin") return can(staff.role, "stats") || can(staff.role, "articles");
    return !link.perm || can(staff.role, link.perm);
  });
  return (
    <div className="min-h-screen bg-paper text-ink lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-card text-ink lg:min-h-screen lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-4">
          <Link to="/" className="font-serif text-xl leading-none">Львів<br />Сьогодні</Link>
          <button type="button" className="border border-line px-3 py-2 text-xs lg:hidden" onClick={() => setNav((value) => !value)}>Меню</button>
        </div>
        <nav className={`${nav ? "block" : "hidden"} border-t border-line lg:block`} aria-label="Редакція">
          {visible.map((link) => (
            <a key={link.href} href={link.href} className={`flex items-center justify-between px-4 py-2.5 text-sm hover:bg-paper ${pathname === link.href ? "bg-accent text-accent-ink" : ""}`}>
              <span>{link.label}</span>
              {link.badge && badges[link.badge] > 0 ? <span className="bg-accent px-1.5 text-xs text-accent-ink tabular-nums">{badges[link.badge]}</span> : null}
            </a>
          ))}
        </nav>
        <div className="hidden px-4 py-4 text-xs text-muted lg:block">
          <p>{staff.name}</p>
          <p>{ROLE_LABEL[staff.role as StaffRole]}</p>
          <div className="mt-3"><UserButton /></div>
        </div>
      </aside>
      <div>
        <div className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
          <p className="text-sm">{staff.name}</p>
          <UserButton />
        </div>
        <div className="px-4 py-6 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

export function PageTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-3">
      <h1 className="font-serif text-3xl">{title}</h1>
      {action}
    </div>
  );
}

export const fieldClass = "w-full border border-line bg-card px-3 py-2 text-sm outline-none";

export function errText(error: unknown): string {
  return error instanceof Error ? error.message : "Сталася помилка";
}
