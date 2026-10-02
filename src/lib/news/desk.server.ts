import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";

const COOKIE = "ls_desk";

function key(): Buffer {
  const material = process.env.DATABASE_URL || process.env.BETTER_AUTH_SECRET || "lviv-sogodni";
  return createHash("sha256").update(`ls-desk:${material}`).digest();
}

export function sealDesk(userId: string): string {
  const body = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString("base64url");
  const sig = createHmac("sha256", key()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function deskSetCookie(token: string): string {
  return `${COOKIE}=${token}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`;
}

export function userIdFromDeskCookie(): string | null {
  const request = getRequest();
  const header = request?.headers.get("cookie") ?? "";
  const match = header.match(/(?:^|;\s*)ls_desk=([^;]+)/);
  if (!match?.[1]) return null;
  const [body, sig] = decodeURIComponent(match[1]).split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", key()).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as { userId?: string; exp?: number };
    if (!data.userId || !data.exp || data.exp < Date.now()) return null;
    return data.userId;
  } catch {
    return null;
  }
}
