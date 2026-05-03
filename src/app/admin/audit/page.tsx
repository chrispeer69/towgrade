import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Audit log — TowGrade Admin",
};

const TS_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type ActionRow = {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  metadata: { email?: string; notes?: string } | null;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  "operator.verify": "Approved operator",
  "operator.reject": "Denied operator",
  "admin.add":       "Added admin",
  "admin.remove":    "Removed admin",
  "admin.disable":   "Disabled admin",
  "provider.create": "Created provider",
  "provider.update": "Updated provider",
  "provider.merge":  "Merged provider",
  "provider.delete": "Deleted provider",
};

export default async function AuditLogPage() {
  const sb = createAdminClient();

  const { data: actions, error } = await sb
    .from("admin_actions")
    .select(
      "id, admin_id, action, target_type, target_id, metadata, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (actions ?? []) as ActionRow[];

  // Resolve email labels via two batched fetches rather than nested
  // joins — keeps the query simple, the lookup deterministic, and
  // tolerant of dangling FKs (admin_id may be NULL after the actor
  // was removed; target_id can point at a deleted operator/admin).
  const adminIds = new Set<string>();
  const operatorIds = new Set<string>();
  for (const r of rows) {
    if (r.admin_id) adminIds.add(r.admin_id);
    if (r.target_type === "admin") adminIds.add(r.target_id);
    if (r.target_type === "operator") operatorIds.add(r.target_id);
  }

  const [adminLookup, operatorLookup] = await Promise.all([
    adminIds.size
      ? sb
          .from("admins")
          .select("id, email")
          .in("id", Array.from(adminIds))
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
    operatorIds.size
      ? sb
          .from("operators")
          .select("id, email")
          .in("id", Array.from(operatorIds))
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
  ]);

  const adminEmails = new Map(
    ((adminLookup.data ?? []) as { id: string; email: string }[]).map(
      (a) => [a.id, a.email]
    )
  );
  const operatorEmails = new Map(
    ((operatorLookup.data ?? []) as { id: string; email: string }[]).map(
      (o) => [o.id, o.email]
    )
  );

  const actorEmail = (r: ActionRow) =>
    (r.admin_id && adminEmails.get(r.admin_id)) || "(removed)";

  const targetLabel = (r: ActionRow) => {
    if (r.target_type === "operator") {
      return operatorEmails.get(r.target_id) || "(deleted)";
    }
    if (r.target_type === "admin") {
      // Prefer the live row email; fall back to the snapshot in
      // metadata (admin.remove writes the email there before the row
      // is gone).
      return (
        adminEmails.get(r.target_id) ||
        r.metadata?.email ||
        "(removed)"
      );
    }
    if (r.target_type === "provider") return r.target_id;
    return r.target_id;
  };

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Activity</span>
        <h1 className="page-title">Audit log</h1>
        <p className="page-sub">
          The most recent 50 admin actions. Append-only — entries are
          never edited or deleted.
        </p>
      </header>

      {error && (
        <div className="error">
          Could not load audit log: {error.message}
        </div>
      )}

      {rows.length === 0 ? (
        <section className="admin-empty">
          <div className="admin-empty__title">No admin actions yet.</div>
          <div className="admin-empty__body">
            Approvals, denials, and admin management actions will appear
            here once they happen.
          </div>
        </section>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="admin-table__mono" data-label="When">
                    {TS_FMT.format(new Date(r.created_at))}
                  </td>
                  <td
                    className="admin-table__mono admin-table__email"
                    data-label="Admin"
                  >
                    {actorEmail(r)}
                  </td>
                  <td data-label="Action">
                    {ACTION_LABELS[r.action] ?? r.action}
                  </td>
                  <td
                    className="admin-table__mono admin-table__email"
                    data-label="Target"
                  >
                    {targetLabel(r)}
                  </td>
                  <td data-label="Notes">{r.metadata?.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
