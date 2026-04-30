"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentQuarter } from "@/lib/period";
import { CATEGORY_KEYS } from "../categories";

export type RateFormState =
  | { ok: false; error?: string; fieldErrors?: Record<string, string> }
  | { ok: true };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NARRATIVE_MAX = 4000;

function readJsonObject(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {}
  return null;
}

export async function submitReview(
  _prev: RateFormState,
  formData: FormData
): Promise<RateFormState> {
  // ---------- Auth ----------
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out — sign in again." };

  const { data: operator } = await supabase
    .from("operators")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!operator) {
    return { ok: false, error: "Operator record not found." };
  }

  // ---------- Parse ----------
  const provider_id = String(formData.get("provider_id") ?? "");
  if (!UUID_RE.test(provider_id)) {
    return { ok: false, error: "Invalid provider." };
  }

  const scoresObj = readJsonObject(formData.get("category_scores"));
  if (!scoresObj) return { ok: false, error: "Could not read scores." };

  const narrativesObj = readJsonObject(formData.get("narratives")) ?? {};

  const wouldRecommendRaw = String(formData.get("would_recommend") ?? "");
  const isPublicRaw = String(formData.get("is_public") ?? "");

  // ---------- Validate ----------
  const fieldErrors: Record<string, string> = {};
  const cleanScores: Record<string, number> = {};
  for (const k of CATEGORY_KEYS) {
    const v = scoresObj[k];
    if (
      typeof v !== "number" ||
      !Number.isInteger(v) ||
      v < 1 ||
      v > 10
    ) {
      fieldErrors[k] = "Score 1–10 required";
    } else {
      cleanScores[k] = v;
    }
  }

  let wouldRecommend: boolean | null = null;
  if (wouldRecommendRaw === "yes") wouldRecommend = true;
  else if (wouldRecommendRaw === "no") wouldRecommend = false;
  else fieldErrors.would_recommend = "Pick yes or no";

  const isPublic = isPublicRaw === "true";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "Complete all categories and pick a recommendation.",
      fieldErrors,
    };
  }

  // Narratives — trim, cap, drop empties. Only known keys (12 categories +
  // "summary"); silently ignore anything else a client might have stuffed in.
  const cleanNarratives: Record<string, string> = {};
  const allowedNarrativeKeys = new Set<string>([
    ...CATEGORY_KEYS,
    "summary",
  ]);
  for (const [k, v] of Object.entries(narrativesObj)) {
    if (!allowedNarrativeKeys.has(k)) continue;
    if (typeof v !== "string") continue;
    const trimmed = v.trim().slice(0, NARRATIVE_MAX);
    if (trimmed) cleanNarratives[k] = trimmed;
  }

  // ---------- Verify provider is live ----------
  const admin = createAdminClient();
  const { data: provider } = await admin
    .from("providers")
    .select("id")
    .eq("id", provider_id)
    .is("deleted_at", null)
    .is("merged_into_id", null)
    .maybeSingle();
  if (!provider) return { ok: false, error: "Provider not found." };

  // ---------- Compute period + overall ----------
  const period = currentQuarter();
  const sum = CATEGORY_KEYS.reduce((s, k) => s + cleanScores[k], 0);
  const overall_score = Math.round((sum / CATEGORY_KEYS.length) * 10) / 10;

  // ---------- Upsert ----------
  // Trigger set_counts_in_aggregate recomputes counts_in_aggregate from
  // is_public + operator verification — never set it from app code.
  const { data: existing } = await admin
    .from("reviews")
    .select("id")
    .eq("operator_id", operator.id)
    .eq("provider_id", provider_id)
    .eq("period", period)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("reviews")
      .update({
        category_scores: cleanScores,
        narratives: cleanNarratives,
        would_recommend: wouldRecommend,
        is_public: isPublic,
        overall_score,
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin.from("reviews").insert({
      operator_id: operator.id,
      provider_id,
      period,
      category_scores: cleanScores,
      narratives: cleanNarratives,
      would_recommend: wouldRecommend,
      is_public: isPublic,
      overall_score,
    });
    if (error) return { ok: false, error: error.message };
  }

  redirect("/dashboard/reviews");
}
