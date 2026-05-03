import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { signOut } from "@/app/dashboard/actions";
import AdminTabs from "./AdminTabs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdmin();
  if (!admin) redirect("/");

  return (
    <>
      <header className="topbar admin-bar">
        <Link href="/" className="wordmark">
          Tow<em>Grade</em>
          <sup>Admin</sup>
        </Link>
        <div className="tr">
          <span className="admin-bar__who">{admin.full_name}</span>
          <form action={signOut}>
            <button type="submit" className="btn">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <AdminTabs />
      <main className="page admin-main">{children}</main>
    </>
  );
}
