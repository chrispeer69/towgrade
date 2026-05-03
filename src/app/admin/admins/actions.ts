"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type AddAdminState =
  | { ok: false; error?: string }
  | { ok: true; email: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addAdmin(
  _prev: AddAdminState,
  formData: FormData
): Promise<AddAdminState> {
  const me = await getAdmin();
  if (!me) return { ok: false, error: "Not authorized." };

  const raw = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(raw)) {
    return { ok: false, error: "Enter a valid email." };
  }

  const sb = createAdminClient();

  // Look up the auth user by email. supabase-js exposes no
  // getUserByEmail; listUsers paginates, so we ask for one large page.
  // Acceptable while total user count is well below perPage; revisit
  // (likely a thin Admin REST call to /auth/v1/admin/users?email=...)
  // once the user table outgrows a single page.
  const { data: usersPage, error: lookupErr } =
    await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (lookupErr) {
    return { ok: false, error: `Could not look up users: ${lookupErr.message}` };
  }
  const authUser = usersPage.users.find(
    (u) => (u.email ?? "").toLowerCase() === raw
  );
  if (!authUser) {
    return {
      ok: false,
      error:
        "No registered user with that email. They must register at /register first.",
    };
  }

  const { data: existing } = await sb
    .from("admins")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "Already an admin." };
  }

  // full_name is NOT NULL on admins. Pull from the auth user's metadata
  // when it's been populated by /register; fall back to the email
  // local-part so the column is satisfied even for users who registered
  // before metadata was being captured.
  const meta = (authUser.user_metadata ?? {}) as {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    company_name?: string;
  };
  const composedName =
    [meta.first_name, meta.last_name].filter(Boolean).join(" ").trim() ||
    (typeof meta.full_name === "string" ? meta.full_name : "") ||
    raw.split("@")[0];

  const { data: newAdmin, error: insertErr } = await sb
    .from("admins")
    .insert({
      auth_user_id: authUser.id,
      email: raw,
      full_name: composedName,
      role: "verifier",
    })
    .select("id")
    .single();
  if (insertErr) {
    return { ok: false, error: `Could not add admin: ${insertErr.message}` };
  }

  // metadata.email lets the audit log render the actor / target even if
  // the admin row is later removed (admin_id will go NULL via the FK
  // relaxation in 0013_admin_management).
  const { error: auditErr } = await sb.from("admin_actions").insert({
    admin_id: me.id,
    action: "admin.add",
    target_type: "admin",
    target_id: newAdmin.id,
    metadata: { email: raw },
  });
  if (auditErr) {
    return {
      ok: false,
      error: `Admin added but audit failed: ${auditErr.message}`,
    };
  }

  revalidatePath("/admin/admins");
  return { ok: true, email: raw };
}

export async function removeAdmin(
  adminId: string
): Promise<{ error?: string }> {
  const me = await getAdmin();
  if (!me) return { error: "Not authorized." };
  if (!UUID_RE.test(adminId)) return { error: "Invalid admin id." };

  // Self-removal block (server-side floor; the UI also hides the
  // Remove button for the current admin's row).
  if (adminId === me.id) {
    return { error: "You cannot remove your own admin access." };
  }

  const sb = createAdminClient();

  // Capture email up-front: the row is about to be gone, and we want
  // it preserved in the audit row's metadata so the audit log keeps
  // the target readable.
  const { data: target, error: targetErr } = await sb
    .from("admins")
    .select("email")
    .eq("id", adminId)
    .maybeSingle();
  if (targetErr) return { error: `Could not load admin: ${targetErr.message}` };
  if (!target) return { error: "Admin not found." };

  // Delete. The DB trigger trg_admins_block_last_delete is the safety
  // floor for the last-active-admin invariant; the error code is
  // check_violation. Surface a clean message rather than leaking the
  // raw Postgres exception text.
  const { error: deleteErr } = await sb
    .from("admins")
    .delete()
    .eq("id", adminId);
  if (deleteErr) {
    if (deleteErr.message.includes("Cannot remove the last active admin")) {
      return { error: "Cannot remove the last active admin." };
    }
    return { error: `Could not remove admin: ${deleteErr.message}` };
  }

  // Audit AFTER the delete so that a trigger-rejected delete does not
  // leave behind an orphan audit row. admin_id stays the actor (still
  // present); target_id is the now-deleted admin's id, with the email
  // snapshotted in metadata.
  const { error: auditErr } = await sb.from("admin_actions").insert({
    admin_id: me.id,
    action: "admin.remove",
    target_type: "admin",
    target_id: adminId,
    metadata: { email: target.email },
  });
  if (auditErr) {
    return { error: `Admin removed but audit failed: ${auditErr.message}` };
  }

  revalidatePath("/admin/admins");
  return {};
}
