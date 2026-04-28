import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role client. Bypasses RLS. ONLY usable in server-side code (server
 * components, route handlers, server actions) — `server-only` import will hard
 * error at build time if anything bundles this into a client component.
 *
 * Used for privileged operations during signup (inserting the operator row
 * after auth.users is created) and any future admin tasks. Each call returns
 * a fresh client — these calls are short-lived and we don't need a singleton.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase admin client missing env vars (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
