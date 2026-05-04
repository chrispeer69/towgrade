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

function stripTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}
