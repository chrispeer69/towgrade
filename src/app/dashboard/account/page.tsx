import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/operator";
import AccountForm from "./AccountForm";

export const metadata = {
  title: "Account — TowGrade",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { operator, error } = await getOperator();
  if (!operator) {
    return (
      <>
        <header className="page-head">
          <span className="eyebrow">Account</span>
          <h1 className="page-title">Account.</h1>
          <p className="page-sub">
            Manage your TowGrade profile and password.
          </p>
        </header>
        <div className="error">
          Could not load your operator record: {error ?? "missing record"}
        </div>
      </>
    );
  }

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Account</span>
        <h1 className="page-title">Account.</h1>
        <p className="page-sub">
          Manage your TowGrade profile and password.
        </p>
      </header>
      <AccountForm
        email={user.email ?? ""}
        firstName={operator.first_name}
        lastName={operator.last_name}
        companyName={operator.company_name}
        state={operator.state}
        fleetSize={operator.fleet_size}
      />
    </>
  );
}
