import { getRequest } from "@tanstack/react-start/server";

/**
 * Fetch-Metadata sibling isolation — **server-only** (`.server.ts` suffix).
 *
 * MUST keep the `.server` suffix: this file imports `@tanstack/react-start/server`
 * (`getRequest` → Node `AsyncLocalStorage`). If it is imported from a dual
 * client/server module under a non-`.server` name, Vite ships it to the browser
 * and the app dies with: `AsyncLocalStorage is not a constructor`.
 *
 * Apps deployed on `*.grok.me` are "same-site" to each other but MUTUALLY
 * UNTRUSTED, and a `SameSite=Lax` session cookie IS sent on same-site
 * subrequests — so without this, a malicious sibling could make a SCRIPTED
 * (fetch/XHR/form-POST) request to this app's server functions and ride this
 * app's session cookie.
 *
 * We allow only: same-origin requests (this app's own client), non-browser
 * requests (SSR / server-to-server, which send no `Sec-Fetch-Site`), and
 * top-level GET navigations (how the OAuth callback and normal page loads
 * arrive). Every cross-site / same-site *scripted* request is rejected.
 * Together with `__Host-` cookies and Better Auth's `trustedOrigins`, this
 * closes the sibling-tenant attack surface. Enforced at the `authMiddleware`
 * chokepoint (see `middleware.ts`).
 */
export class CrossSiteRequestError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden: cross-site request blocked");
    this.name = "CrossSiteRequestError";
  }
}

/** Throw `CrossSiteRequestError` for a scripted cross-site/sibling request. */
export function assertSameSiteRequest(): void {
  const request = getRequest();
  if (!request) return;
  const h = request.headers;
  // A browser request from this site itself. Safari on iPhone often labels that
  // fetch as `same-site` instead of `same-origin`, which was blocking every
  // editorial action after a successful login. The Origin host still matches
  // this host; a sibling site cannot forge that.
  const origin = h.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const hosts = [h.get("x-forwarded-host"), h.get("host")].flatMap((value) =>
        value ? value.split(",").map((part) => part.trim()).filter(Boolean) : [],
      );
      if (hosts.includes(originHost)) return;
    } catch {
      /* malformed origin — fall through to the fetch-metadata check */
    }
  }
  const site = h.get("sec-fetch-site");
  if (!site || site === "same-origin" || site === "none") return;
  const dest = h.get("sec-fetch-dest");
  const isTopLevelGet =
    h.get("sec-fetch-mode") === "navigate" &&
    request.method === "GET" &&
    dest !== "object" &&
    dest !== "embed";
  if (isTopLevelGet) return;
  throw new CrossSiteRequestError();
}
