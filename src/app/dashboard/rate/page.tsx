import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentQuarter } from "@/lib/period";

export const metadata = {
  title: "Rate a provider — TowGrade",
};

export default async function RatePage() {
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

  const period = currentQuarter();
  const admin = createAdminClient();

  const [providersRes, reviewsRes] = await Promise.all([
    admin
      .from("providers")
      .select("id, name, slug, abbr, brand_color")
      .is("deleted_at", null)
      .is("merged_into_id", null)
      .order("name"),
    admin
      .from("reviews")
      .select("provider_id")
      .eq("operator_id", operator.id)
      .eq("period", period),
  ]);

  const providers = providersRes.data ?? [];
  const reviewedSet = new Set(
    (reviewsRes.data ?? []).map((r) => r.provider_id)
  );

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Rate a provider</span>
        <h1 className="page-title">Score the providers you work with.</h1>
        <p className="page-sub">
          Rate each provider across 14 operational categories. Numeric scores
          can contribute to TowGrade&apos;s public aggregate. Narrative comments
          stay private — always.
        </p>
        <div className="rate-period-tag">
          Current period <span className="rate-period-tag__val">{period}</span>
        </div>
      </header>

      <section className="rate-grid" aria-label="Providers">
        {providers.map((p) => {
          const reviewed = reviewedSet.has(p.id);
          return (
            <Link
              key={p.id}
              href={`/dashboard/rate/${p.slug}`}
              className="rate-card"
            >
              <div
                className="rate-card__avatar"
                style={{ background: p.brand_color }}
                aria-hidden
              >
                {p.abbr}
              </div>
              <div className="rate-card__name">{p.name}</div>
              <div
                className={`rate-card__cta${reviewed ? " is-edit" : ""}`}
              >
                {reviewed ? "Edit your review →" : "Rate →"}
              </div>
            </Link>
          );
        })}
      </section>
    </>
  );
}
