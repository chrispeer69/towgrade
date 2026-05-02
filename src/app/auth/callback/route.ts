import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdminsNewOperator } from "@/lib/notifications/notify-admins-new-operator";

/**
 * Email-confirmation + OAuth callback. Supabase appends ?code=... to its
 * redirect; we exchange that code for a session (sets the auth cookies),
 * then send the user to the requested destination (?next=...) or /dashboard.
 *
 * If the exchange fails, we land on /register?error=... so the form can
 * surface the failure rather than dumping the user on a silent /dashboard.
 *
 * On the first successful confirmation for a pending operator, we fire a
 * notification email to every admin via `after()` so the redirect response
 * is sent immediately and the email work runs after the response. Dedup is
 * enforced atomically inside notifyAdminsNewOperator() — repeat callbacks
 * are safe and will not produce duplicate emails.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      new URL("/register?error=missing_code", url.origin)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/register?error=${encodeURIComponent(error.message)}`,
        url.origin
      )
    );
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const admin = createAdminClient();
      const { data: op } = await admin
        .from("operators")
        .select("id, verification_status, admin_notified_at")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (
        op &&
        op.verification_status === "pending" &&
        op.admin_notified_at === null
      ) {
        after(notifyAdminsNewOperator(op.id));
      }
    }
  } catch (err) {
    // Notification scheduling must never block the redirect.
    console.error("[auth/callback] admin notification scheduling failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
