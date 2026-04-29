import { getOperator } from "@/lib/operator";

export const metadata = {
  title: "Dashboard — TowGrade",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Verification pending",
  verified: "Verified operator",
  rejected: "Verification rejected",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "tbadge tfl",
  verified: "tbadge tup",
  rejected: "tbadge tdn",
};

export default async function DashboardPage() {
  const { operator, error } = await getOperator();

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Operator dashboard</span>
        <h1 className="page-title">
          {operator?.first_name
            ? `Welcome, ${operator.first_name}.`
            : "Welcome."}
        </h1>
        {operator?.company_name && (
          <p className="page-sub">{operator.company_name}</p>
        )}
      </header>

      {error && (
        <div className="error">
          Could not load your operator record: {error}
        </div>
      )}

      {!error && !operator && (
        <div className="error">
          Your operator record is missing. This shouldn&apos;t happen — please
          re-register or contact support.
        </div>
      )}

      {operator && (
        <section
          style={{
            background: "var(--white)",
            border: "var(--border)",
            borderRadius: "var(--rmd)",
            boxShadow: "var(--sh-sm)",
            padding: "1.5rem 1.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            maxWidth: 720,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  color: "var(--ink-30)",
                  marginBottom: 4,
                }}
              >
                Account status
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--ink-70)",
                  lineHeight: 1.5,
                }}
              >
                {operator.verification_status === "pending"
                  ? "Your account is created. We're reviewing your company details before reviews you submit count toward public scores."
                  : operator.verification_status === "verified"
                    ? "Your reviews count toward the public scoreboard."
                    : "Your verification was rejected. Contact support for next steps."}
              </div>
            </div>
            <span
              className={STATUS_CLASS[operator.verification_status] ?? "tbadge tfl"}
            >
              {STATUS_LABEL[operator.verification_status] ??
                operator.verification_status}
            </span>
          </div>

          <div
            style={{
              borderTop: "var(--border)",
              paddingTop: "1.25rem",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1rem",
              fontSize: 12,
              color: "var(--ink-50)",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-m)",
                  fontSize: 13,
                  color: "var(--ink)",
                }}
              >
                {operator.state}
              </div>
              <div>State</div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-m)",
                  fontSize: 13,
                  color: "var(--ink)",
                }}
              >
                {operator.fleet_size}
              </div>
              <div>Fleet size</div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-m)",
                  fontSize: 13,
                  color: "var(--ink)",
                }}
              >
                {new Date(operator.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div>Joined</div>
            </div>
          </div>
        </section>
      )}

      <section
        style={{
          marginTop: "2.5rem",
          padding: "2.5rem 2rem",
          textAlign: "center",
          background: "var(--ink-02)",
          border: "var(--border)",
          borderRadius: "var(--rmd)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-d)",
            fontSize: 18,
            fontWeight: 500,
            color: "var(--ink-50)",
            marginBottom: 6,
          }}
        >
          Dashboard coming soon
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-30)" }}>
          Rate-a-provider, my reviews, and intelligence panels land in the next
          build.
        </div>
      </section>
    </>
  );
}
