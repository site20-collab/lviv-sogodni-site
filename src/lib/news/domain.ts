import { can } from "./permissions.ts";
import type { StaffRole } from "./types";

export type SaveAction = "draft" | "pending" | "publish" | "schedule" | "autosave";

export function resolveStatus(
  action: SaveAction,
  role: StaffRole,
  scheduledAt: string | null,
  now = Date.now(),
): { status: "DRAFT" | "PENDING" | "SCHEDULED" | "PUBLISHED"; error?: string } {
  if (action === "autosave" || action === "draft") return { status: "DRAFT" };
  if (action === "pending") return { status: "PENDING" };
  if (action === "schedule") {
    if (!scheduledAt) return { status: "SCHEDULED", error: "Вкажіть дату і час публікації" };
    const ts = new Date(scheduledAt).getTime();
    if (Number.isNaN(ts) || ts <= now) {
      return { status: "SCHEDULED", error: "Час публікації має бути в майбутньому" };
    }
    if (!can(role, "publish")) return { status: "PENDING" };
    return { status: "SCHEDULED" };
  }
  if (!can(role, "publish")) return { status: "PENDING" };
  return { status: "PUBLISHED" };
}

export function isDue(status: string, scheduledAt: string | null, now = Date.now()): boolean {
  if (status !== "SCHEDULED" || !scheduledAt) return false;
  const ts = new Date(scheduledAt).getTime();
  return !Number.isNaN(ts) && ts <= now;
}
