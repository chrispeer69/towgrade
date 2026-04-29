import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Sign In — TowGrade",
  description:
    "Sign in to your verified TowGrade operator account.",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    redirect("/dashboard");
  }

  return (
    <main className="form-shell">
      <div className="form-card">
        <div className="form-head">
          <h1>Sign in</h1>
          <p>Welcome back. Enter your credentials to continue.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
