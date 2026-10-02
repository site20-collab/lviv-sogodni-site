import type { StaffRole } from "./types";

const MATRIX: Record<StaffRole, string[]> = {
  SUPER_ADMIN: ["*"],
  ADMIN: [
    "articles",
    "publish",
    "categories",
    "tags",
    "media",
    "authors",
    "users",
    "comments",
    "menu",
    "ads",
    "stats",
    "settings",
    "messages",
    "seo",
    "subscribers",
    "homepage",
  ],
  EDITOR: ["articles", "publish", "categories", "tags", "media", "comments", "messages"],
  AUTHOR: ["articles", "media"],
  MODERATOR: ["comments", "messages"],
  ANALYST: ["stats"],
};

export function can(role: StaffRole, perm: string): boolean {
  const list = MATRIX[role];
  return list.includes("*") || list.includes(perm);
}

export function canAny(role: StaffRole, perms: string[]): boolean {
  return perms.some((perm) => can(role, perm));
}
