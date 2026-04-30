import { createClient } from "@/lib/supabase/server";

export type Admin = {
  id: string;
  email: string;
  full_name: string;
  role: "super_admin" | "verifier";
  disabled_at: string | null;
};

// Returns the admin record for the current authenticated user, or null if
// the user is not an admin (or not signed in). Used by /admin/layout.tsx
// to gate access. Mirrors the getOperator() pattern.
export async function getAdmin(): Promise<Admin | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("admins")
    .select("id, email, full_name, role, disabled_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  if (data.disabled_at) return null;

  return data as Admin;
}
