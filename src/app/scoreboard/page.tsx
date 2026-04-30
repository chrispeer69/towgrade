import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ProviderRow = Database["public"]["Views"]["public_providers"]["Row"];

const TYPE_LABEL: Record<string, string> = {
  motor_club: "Motor Club",
  rsa_network: "RSA Network",
  insurer_direct: "Insurer-Direct",
};

const AGGREGATE_THRESHOLD = 5;

// Server-rendered. createClient() reads cookies via @supabase/ssr → marks
// the route dynamic per request, so aggregate scores update on the next
// page load without any explicit revalidation API.
export default async function ScoreboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_providers")
    .select(
      "id,name,abbr,brand_color,provider_type,aggregate_review_count,aggregate_overall_score,aggregate_recommend_pct"
    )
    .order("name");

  const providers = (data ?? []) as ProviderRow[];

  return (
    <main className="page">
      <header className="page-head">
        <span className="eyebrow">Public Scoreboard</span>
        <h1 className="page-title">Provider scorecards</h1>
        <p className="page-sub">
          Aggregate scores from verified operators · anonymized · updated in real time.
        </p>
      </header>

      {error && (
        <div className="error">
          Could not load providers: {error.message}
        </div>
      )}

      <div className="bgrid">
        {providers.map((p) => {
          const count = p.aggregate_review_count ?? 0;
          const hasAggregate =
            count >= AGGREGATE_THRESHOLD &&
            p.aggregate_overall_score != null;

          return (
            <article key={p.id ?? p.abbr} className="bc">
              <div className="bch">
                <div
                  className="pl"
                  style={{ background: p.brand_color ?? "var(--ink-70)" }}
                  aria-hidden
                >
                  {p.abbr}
                </div>
                <div>
                  <div className="bn">{p.name}</div>
                  <div className="btype">
                    {TYPE_LABEL[p.provider_type ?? ""] ?? p.provider_type}
                  </div>
                </div>
              </div>

              {hasAggregate ? (
                <div className="bscore">
                  <div className="bscore-num">
                    {p.aggregate_overall_score?.toFixed(1)}
                  </div>
                  {p.aggregate_recommend_pct != null && (
                    <div className="bscore-rec">
                      {p.aggregate_recommend_pct}% would recommend
                    </div>
                  )}
                </div>
              ) : count > 0 ? (
                <div className="bunder">
                  <div className="bunder-count">
                    {count} review{count === 1 ? "" : "s"} so far
                  </div>
                  <div className="bunder-msg">
                    Public scoring activates at {AGGREGATE_THRESHOLD}
                  </div>
                </div>
              ) : (
                <div className="bempty">
                  <div className="bempty-msg">Awaiting first review</div>
                  <div className="bempty-sub">
                    Be the first verified operator to rate this provider
                  </div>
                </div>
              )}

              <div className="bfoot">
                <span className="brev">
                  {count} verified review{count === 1 ? "" : "s"}
                </span>
                {!hasAggregate && (
                  <span className="tbadge tfl">— Pending</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
