import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentQuarter } from "@/lib/period";
import RateForm, { type ExistingReview } from "./RateForm";

export const metadata = {
  title: "Rate provider — TowGrade",
};

export default async function ProviderRatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: operator } = await supabase
    .from("operators")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!operator) redirect("/dashboard");

  const admin = createAdminClient();

  const { data: provider } = await admin
    .from("providers")
    .select("id, name, slug, abbr, brand_color")
    .eq("slug", slug)
    .is("deleted_at", null)
    .is("merged_into_id", null)
    .maybeSingle();
  if (!provider) notFound();

  const period = currentQuarter();
  const { data: existing } = await admin
    .from("reviews")
    .select("category_scores, narratives, would_recommend, is_public")
    .eq("operator_id", operator.id)
    .eq("provider_id", provider.id)
    .eq("period", period)
    .maybeSingle();

  const existingReview: ExistingReview | null = existing
    ? {
        category_scores:
          (existing.category_scores as Record<string, number>) ?? {},
        narratives:
          (existing.narratives as Record<string, string>) ?? {},
        would_recommend: existing.would_recommend,
        is_public: existing.is_public,
      }
    : null;

  return (
    <RateForm
      provider={provider}
      period={period}
      existingReview={existingReview}
    />
  );
}
