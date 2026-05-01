import { createClient } from "@/lib/supabase/server";

export type Operator = {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  state: string;
  fleet_size: string;
  verification_status: string;
  created_at: string;
};

export type GetOperatorResult = {
  operator: Operator | null;
  error: string | null;
};

export async function getOperator(): Promise<GetOperatorResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { operator: null, error: null };
  }
  const { data, error } = await supabase
    .from("operators")
    .select(
      "id, first_name, last_name, company_name, state, fleet_size, verification_status, created_at"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return {
    operator: (data as Operator | null) ?? null,
    error: error ? error.message : null,
  };
}
