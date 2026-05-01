import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/operator";
import { currentQuarter, formatPeriod } from "@/lib/period";

export const metadata = {
  title: "My reviews — TowGrade",
};

type ReviewRow = {
  id: string;
  provider_id: string;
  period: string;
  overall_score: number;
  would_recommend: boolean | null;
  is_public: boolean;
  counts_in_aggregate: boolean;
  created_at: string;
  providers: { name: string; slug: string } | null;
};

type StatusKind = "rejected" | "private" | "pending" | "counted";

// Status precedence: Rejected > Private > Pending verification > Counted.
// A rejected operator's reviews show "Rejected" regardless of privacy toggle —
// the rejection is the headline fact. See SCHEMA.md §reviews on the
// is_public / counts_in_aggregate intent-vs-verdict separation.
function deriveStatus(
  review: Pick<ReviewRow, "is_public" | "counts_in_aggregate">,
  verificationStatus: string
): StatusKind {
  if (verificationStatus === "rejected") return "rejected";
  if (!review.is_public) return "private";
  if (verificationStatus === "pending") return "pending";
  if (review.counts_in_aggregate) return "counted";
  return "private";
}

const STATUS_LABEL: Record<StatusKind, string> = {
  rejected: "Rejected",
  private: "Private",
  pending: "Pending verification",
  counted: "Counted",
};

export default async function ReviewsPage() {
  const { operator, error: opError } = await getOperator();
  if (!operator) redirect("/login");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, provider_id, period, overall_score, would_recommend, is_public, counts_in_aggregate, created_at, providers ( name, slug )"
    )
    .eq("operator_id", operator.id)
    .order("created_at", { ascending: false });

  const reviews = (data ?? []) as unknown as ReviewRow[];
  const period = currentQuarter();

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">My reviews</span>
        <h1 className="page-title">Your submitted reviews.</h1>
        <p className="page-sub">
          Reviews you&apos;ve submitted to TowGrade&apos;s verified operator
          data set.
        </p>
      </header>

      {(opError || error) && (
        <div className="error">
          Could not load your reviews: {opError ?? error?.message}
        </div>
      )}

      {!opError && !error && reviews.length === 0 ? (
        <section className="admin-empty">
          <div className="admin-empty__title">No reviews yet.</div>
          <div className="admin-empty__body">
            You haven&apos;t submitted any reviews yet. Rate your first
            provider to start contributing to TowGrade&apos;s verified
            operator data set.
          </div>
          <div className="admin-empty__cta">
            <Link href="/dashboard/rate" className="bf p admin-btn">
              Rate a provider →
            </Link>
          </div>
        </section>
      ) : reviews.length > 0 ? (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Quarter</th>
                <th>Overall</th>
                <th>Recommends</th>
                <th>Visibility</th>
                <th>Status</th>
                <th className="admin-table__actions-head"></th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => {
                const open = r.period === period;
                const status = deriveStatus(r, operator.verification_status);
                const slug = r.providers?.slug;
                return (
                  <tr key={r.id}>
                    <td
                      className="admin-table__name"
                      data-label="Provider"
                    >
                      {r.providers?.name ?? "—"}
                    </td>
                    <td className="admin-table__mono" data-label="Quarter">
                      {formatPeriod(r.period)}
                    </td>
                    <td
                      className="admin-table__mono review-row__score"
                      data-label="Overall"
                    >
                      {Number(r.overall_score).toFixed(1)}
                    </td>
                    <td
                      className="admin-table__mono"
                      data-label="Recommends"
                    >
                      {r.would_recommend === true
                        ? "Yes"
                        : r.would_recommend === false
                          ? "No"
                          : "—"}
                    </td>
                    <td data-label="Visibility">
                      <span
                        className={`review-badge review-badge--${
                          r.is_public ? "public" : "private"
                        }`}
                      >
                        {r.is_public ? "Public" : "Private"}
                      </span>
                    </td>
                    <td data-label="Status">
                      <span
                        className={`review-badge review-badge--${status}`}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td
                      className="admin-table__actions"
                      data-label="Action"
                    >
                      {open && slug ? (
                        <Link
                          href={`/dashboard/rate/${slug}`}
                          className="review-edit-link"
                        >
                          Edit →
                        </Link>
                      ) : (
                        <span className="review-locked">Locked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
