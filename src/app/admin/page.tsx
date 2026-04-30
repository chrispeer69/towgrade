import { createAdminClient } from "@/lib/supabase/admin";
import { approveOperator, denyOperator } from "./actions";

export const metadata = {
  title: "Verification queue — TowGrade Admin",
};

const REGISTERED_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type PendingOperator = {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  state: string;
  fleet_size: string;
  email: string;
  created_at: string;
};

export default async function AdminQueuePage() {
  // Service-role read: queue is admin-only and we need every pending
  // operator regardless of RLS policies on operators.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("operators")
    .select(
      "id, first_name, last_name, company_name, state, fleet_size, email, created_at"
    )
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  const operators = (data ?? []) as PendingOperator[];

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Verification queue</span>
        <h1 className="page-title">Pending operators</h1>
        <p className="page-sub">
          Approve to activate this operator&apos;s reviews in public
          aggregates. Deny to keep the account in a non-counting state.
          Both actions are logged.
        </p>
      </header>

      {error && (
        <div className="error">
          Could not load queue: {error.message}
        </div>
      )}

      {operators.length === 0 ? (
        <section className="admin-empty">
          <div className="admin-empty__title">
            No operators pending verification.
          </div>
          <div className="admin-empty__body">
            New registrations appear here when their email is confirmed.
            Approving an operator activates their reviews in public
            aggregates.
          </div>
        </section>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Operator</th>
                <th>Company</th>
                <th>State</th>
                <th>Fleet</th>
                <th>Email</th>
                <th>Registered</th>
                <th className="admin-table__actions-head">Actions</th>
              </tr>
            </thead>
            <tbody>
              {operators.map((op) => (
                <tr key={op.id}>
                  <td className="admin-table__name">
                    {op.first_name} {op.last_name}
                  </td>
                  <td>{op.company_name}</td>
                  <td className="admin-table__mono">{op.state}</td>
                  <td className="admin-table__mono">{op.fleet_size}</td>
                  <td className="admin-table__mono admin-table__email">
                    {op.email}
                  </td>
                  <td className="admin-table__mono">
                    {REGISTERED_FMT.format(new Date(op.created_at))}
                  </td>
                  <td className="admin-table__actions">
                    <form action={approveOperator}>
                      <input type="hidden" name="operator_id" value={op.id} />
                      <button type="submit" className="bf p admin-btn">
                        Approve
                      </button>
                    </form>
                    <form action={denyOperator}>
                      <input type="hidden" name="operator_id" value={op.id} />
                      <button type="submit" className="bf admin-btn admin-btn--deny">
                        Deny
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
