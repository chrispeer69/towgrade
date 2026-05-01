"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/operator";
import { FLEET_SIZES, STATE_CODES } from "@/lib/profile-options";

export type UpdateProfileState =
  | { ok: false; error?: string; fieldErrors?: Record<string, string> }
  | { ok: true };

export type ChangePasswordState =
  | { ok: false; error?: string; fieldErrors?: Record<string, string> }
  | { ok: true };

function clean(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

export async function updateProfile(
  _prev: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { operator } = await getOperator();
  if (!operator) {
    return { ok: false, error: "Could not load your operator record." };
  }

  const first_name = clean(formData.get("first_name"));
  const last_name = clean(formData.get("last_name"));
  const company_name = clean(formData.get("company_name"));
  const state = clean(formData.get("state"));
  const fleet_size = clean(formData.get("fleet_size"));

  const fieldErrors: Record<string, string> = {};
  if (!first_name) fieldErrors.first_name = "Required";
  if (!last_name) fieldErrors.last_name = "Required";
  if (!company_name) fieldErrors.company_name = "Required";
  if (!STATE_CODES.includes(state)) fieldErrors.state = "Pick a state";
  if (!FLEET_SIZES.includes(fleet_size as (typeof FLEET_SIZES)[number])) {
    fieldErrors.fleet_size = "Pick a fleet size";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // RLS operators_self_update narrows to own row; column-level GRANT
  // restricts the SET list to these five columns. updated_at is touched
  // by the operators_set_updated_at trigger.
  const { error } = await supabase
    .from("operators")
    .update({ first_name, last_name, company_name, state, fleet_size })
    .eq("id", operator.id);

  if (error) {
    return {
      ok: false,
      error: `Could not save profile: ${error.message}`,
    };
  }

  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Need the operator's email to re-auth via signInWithPassword. user.email
  // is the auth identity; it's the same value held in operators.email.
  const email = user.email;
  if (!email) {
    return { ok: false, error: "Account email is missing — contact support." };
  }

  const current_password =
    typeof formData.get("current_password") === "string"
      ? (formData.get("current_password") as string)
      : "";
  const new_password =
    typeof formData.get("new_password") === "string"
      ? (formData.get("new_password") as string)
      : "";
  const confirm_password =
    typeof formData.get("confirm_password") === "string"
      ? (formData.get("confirm_password") as string)
      : "";

  const fieldErrors: Record<string, string> = {};
  if (!current_password) fieldErrors.current_password = "Required";
  if (new_password.length < 8) {
    fieldErrors.new_password = "At least 8 characters";
  }
  if (confirm_password !== new_password) {
    fieldErrors.confirm_password = "Doesn't match";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // Re-auth with the current password. Rotates the session cookie via the
  // SSR client's setAll — same user, same browser, no UX disruption.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: current_password,
  });

  if (reauthError) {
    // Don't reveal whether it was the email or the password.
    return { ok: false, error: "Current password is incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: new_password,
  });

  if (updateError) {
    return {
      ok: false,
      error: `Could not update password: ${updateError.message}`,
    };
  }

  return { ok: true };
}
