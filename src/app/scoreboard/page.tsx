import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ProviderRow = Database["public"]["Views"]["public_providers"]["Row"];

const TYPE_LABEL: Record<string, string> = {
  motor_club: "Motor Club",
  rsa_network: "RSA Network",
  insurer_direct: "Insurer-Direct",
};

export default async function ScoreboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_providers")
    .select("id,name,abbr,brand_color,provider_type")
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
        {providers.map((p) => (
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

            <div className="bempty">
              <div className="bempty-msg">No reviews yet</div>
              <div className="bempty-sub">
                Awaiting first verified operator review
              </div>
            </div>

            <div className="bfoot">
              <span className="brev">0 verified reviews</span>
              <span className="tbadge tfl">— Pending</span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
