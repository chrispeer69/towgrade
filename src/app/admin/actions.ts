"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Decision = "verify" | "reject";

async function decideOperator(formData: FormData, decision: Decision) {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorized.");

  const operatorId = String(formData.get("operator_id") ?? "");
  if (!UUID_RE.test(operatorId)) throw new Error("Invalid operator id.");

  const sb = createAdminClient();

  // Constraint operators_verified_consistency requires
  // (verification_status = 'verified') = (verified_at is not null).
  // Always set both columns explicitly so the invariant holds whether the
  // operator was previously pending or previously verified.
  const update =
    decision === "verify"
      ? { verification_status: "verified", verified_at: new Date().toISOString(), verified_by: admin.id }
      : { verification_status: "rejected", verified_at: null, verified_by: null };

  const { error: updateErr } = await sb
    .from("operators")
    .update(update)
    .eq("id", operatorId);
  if (updateErr) throw new Error(`Could not update operator: ${updateErr.message}`);

  // Audit log. Trigger trg_operators_verification_propagate already handled
  // the review recomputation server-side; nothing to do for that here.
  const { error: auditErr } = await sb.from("admin_actions").insert({
    admin_id: admin.id,
    action: decision === "verify" ? "operator.verify" : "operator.reject",
    target_type: "operator",
    target_id: operatorId,
    metadata: {},
  });
  if (auditErr) throw new Error(`Could not write audit log: ${auditErr.message}`);

  revalidatePath("/admin");
}

export async function approveOperator(formData: FormData) {
  await decideOperator(formData, "verify");
}

export async function denyOperator(formData: FormData) {
  await decideOperator(formData, "reject");
}
