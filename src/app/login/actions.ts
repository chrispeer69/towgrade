"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  ok: false;
  error?: string;
  email?: string;
};

function clean(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

function friendlyError(message: string, code?: string): string {
  const m = message.toLowerCase();
  const c = code?.toLowerCase() ?? "";
  if (c === "invalid_credentials" || m.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (c === "email_not_confirmed" || m.includes("email not confirmed")) {
    return "Please confirm your email first. Check your inbox.";
  }
  return "Something went wrong. Try again.";
}

export async function loginOperator(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const supabase = await createClient();

  const { data: existing } = await supabase.auth.getUser();
  if (existing.user) {
    redirect("/dashboard");
  }

  const email = clean(formData.get("email")).toLowerCase();
  const password =
    typeof formData.get("password") === "string"
      ? (formData.get("password") as string)
      : "";

  if (!email || !password) {
    return {
      ok: false,
      error: "Email or password is incorrect.",
      email,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      ok: false,
      error: friendlyError(error.message, error.code),
      email,
    };
  }

  redirect("/dashboard");
}
