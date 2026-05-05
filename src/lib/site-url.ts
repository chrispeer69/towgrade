import { headers } from "next/headers";

/**
 * Resolves the public site origin for absolute-URL construction in server
 * code (auth email redirects, transactional email CTA links, etc.).
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL — set explicitly (Vercel Production only).
 *   2. VERCEL_BRANCH_URL    — Vercel preview deployments. Provided without a
 *                             protocol prefix; we prepend https://.
 *   3. http://localhost:3000 — local development fallback.
 *
 * Returns the URL with no trailing slash so callers can append paths via
 * template literals without producing double slashes.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return stripTrailingSlash(explicit);

  const vercelBranch = process.env.VERCEL_BRANCH_URL;
  if (vercelBranch) return `https://${stripTrailingSlash(vercelBranch)}`;

  return "http://localhost:3000";
}

/**
 * Returns the origin of the current incoming request. Use this whenever the
 * URL must match where the browser is actually talking to us right now —
 * specifically, anything cookie-bound like a PKCE-flow `emailRedirectTo`,
 * where the verifier cookie is scoped to the host the form was submitted to
 * and the email link must return to the same host for the cookie to travel.
 *
 * Vercel preview deployments expose multiple hostnames per deployment
 * (deployment-specific `VERCEL_URL` and branch-alias `VERCEL_BRANCH_URL`);
 * `*.vercel.app` is on the public suffix list, so cookies do not transfer
 * between them. Reading the request host avoids that mismatch entirely.
 *
 * Falls back to getSiteUrl() if no request scope is available.
 */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return getSiteUrl();
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function stripTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}
