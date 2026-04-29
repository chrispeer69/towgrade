import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/operator";
import DashboardNav from "./DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { operator } = await getOperator();

  return (
    <DashboardNav
      firstName={operator?.first_name ?? null}
      lastName={operator?.last_name ?? null}
      companyName={operator?.company_name ?? null}
    >
      {children}
    </DashboardNav>
  );
}
