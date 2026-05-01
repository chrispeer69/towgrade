"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FLEET_SIZES, STATE_CODES } from "@/lib/profile-options";

export type RegisterState =
  | { ok: false; error?: string; fieldErrors?: Record<string, string> }
  | { ok: true; email: string };

function clean(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

export async function registerOperator(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  // ---------- Validate ----------
  const first_name = clean(formData.get("first_name"));
  const last_name = clean(formData.get("last_name"));
  const company_name = clean(formData.get("company_name"));
  const state = clean(formData.get("state"));
  const fleet_size = clean(formData.get("fleet_size"));
  const email = clean(formData.get("email")).toLowerCase();
  const password = typeof formData.get("password") === "string"
    ? (formData.get("password") as string)
    : "";

  const fieldErrors: Record<string, string> = {};
  if (!first_name) fieldErrors.first_name = "Required";
  if (!last_name) fieldErrors.last_name = "Required";
  if (!company_name) fieldErrors.company_name = "Required";
  if (!STATE_CODES.includes(state)) {
    fieldErrors.state = "Pick a state";
  }
  if (!FLEET_SIZES.includes(fleet_size as (typeof FLEET_SIZES)[number])) {
    fieldErrors.fleet_size = "Pick a fleet size";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email";
  }
  if (password.length < 8) {
    fieldErrors.password = "At least 8 characters";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // ---------- Create the auth user ----------
  // signUp via the SSR client so the PKCE code verifier lands in the cookie
  // jar — exchangeCodeForSession in /auth/callback needs to read it back when
  // the email link returns. The admin client (persistSession=false) can't
  // round-trip the verifier and breaks email confirmation.
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: signup, error: signupError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // No query string — Supabase's URI allowlist matches strictly, and the
      // /auth/callback route handler already defaults `next` to /dashboard.
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: { first_name, last_name, company_name },
    },
  });

  if (signupError) {
    // "User already registered" comes back as 422 — surface it cleanly.
    return { ok: false, error: signupError.message };
  }

  const authUser = signup.user;
  if (!authUser) {
    return {
      ok: false,
      error: "Signup did not return a user — please try again.",
    };
  }

  // ---------- Create the operator row ----------
  // operators has RLS enabled with no INSERT policy for authenticated, so use
  // the service-role client to bypass RLS for this controlled write.
  const admin = createAdminClient();
  const { error: insertError } = await admin
    .from("operators")
    .insert({
      auth_user_id: authUser.id,
      first_name,
      last_name,
      company_name,
      state,
      fleet_size,
      email,
      verification_status: "pending",
    });

  if (insertError) {
    // Roll back the auth user so a half-state doesn't strand the email.
    await admin.auth.admin.deleteUser(authUser.id).catch(() => {});
    return {
      ok: false,
      error: `Could not create operator record: ${insertError.message}`,
    };
  }

  return { ok: true, email };
}
