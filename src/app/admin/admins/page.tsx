import { createAdminClient } from "@/lib/supabase/admin";
import { getAdmin } from "@/lib/admin";
import AddAdminForm from "./AddAdminForm";
import RemoveAdminButton from "./RemoveAdminButton";

export const metadata = {
  title: "Manage admins — TowGrade Admin",
};

const ADDED_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type AdminRow = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  disabled_at: string | null;
};

export default async function ManageAdminsPage() {
  // Layout has already gated; getAdmin() is non-null here. Re-fetch
  // anyway because the page is a separate render and we need `me.id`
  // to mark the current admin's row.
  const me = await getAdmin();
  const sb = createAdminClient();

  const { data, error } = await sb
    .from("admins")
    .select("id, email, full_name, created_at, disabled_at")
    .order("created_at", { ascending: true });

  const admins = (data ?? []) as AdminRow[];

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Admin management</span>
        <h1 className="page-title">Manage admins</h1>
        <p className="page-sub">
          Grant or revoke admin access. Removals are logged. The last
          active admin cannot be removed — add a replacement first.
        </p>
      </header>

      {error && (
        <div className="error">Could not load admins: {error.message}</div>
      )}

      <AddAdminForm />

      <div className="admin-card admin-list">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Added</th>
              <th className="admin-table__actions-head">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => {
              const isMe = me ? a.id === me.id : false;
              return (
                <tr key={a.id}>
                  <td
                    className="admin-table__mono admin-table__email"
                    data-label="Email"
                  >
                    {a.email}
                  </td>
                  <td className="admin-table__name" data-label="Name">
                    {a.full_name || "—"}
                  </td>
                  <td className="admin-table__mono" data-label="Added">
                    {ADDED_FMT.format(new Date(a.created_at))}
                  </td>
                  <td className="admin-table__actions" data-label="Actions">
                    {isMe ? (
                      <span className="admin-self">(you)</span>
                    ) : (
                      <RemoveAdminButton adminId={a.id} email={a.email} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
