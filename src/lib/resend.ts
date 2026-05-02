import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;

/**
 * Lazy singleton Resend client. The constructor is cheap but we only want a
 * single instance per server process, and we want a clear error if the env
 * var is missing rather than a cryptic 401 from the API at send time.
 *
 * Server-side only — `server-only` import errors at build time if anything
 * bundles this into a client component.
 */
export function getResend(): Resend {
  if (client) return client;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "Resend client missing env var RESEND_API_KEY. Set it in Vercel (Production + Preview) and in .env.local for local dev."
    );
  }

  client = new Resend(key);
  return client;
}
