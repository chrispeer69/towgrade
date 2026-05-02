import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend } from "@/lib/resend";
import {
  buildAdminNewOperatorHtml,
  buildAdminNewOperatorSubject,
  buildAdminNewOperatorText,
  type AdminNewOperatorPayload,
} from "@/lib/emails/admin-new-operator";

const FROM = "TowGrade <noreply@send.towgrade.com>";

/**
 * Notify every active admin that a newly-registered operator has confirmed
 * their email and is awaiting verification.
 *
 * Atomic dedup: this function attempts to claim operators.admin_notified_at
 * (NULL → now()) in a single UPDATE. Only the caller whose UPDATE actually
 * affects the row proceeds to send. Concurrent or repeat callers exit silently.
 *
 * Errors during the Resend send are logged and swallowed. The dedup claim is
 * NOT rolled back on send failure — preventing duplicate spam wins over
 * preserving the first-attempt opportunity. A future retry surface can clear
 * admin_notified_at if needed.
 *
 * This function never throws to its caller. It is safe to fire-and-forget
 * via `after()` in a route handler.
 */
export async function notifyAdminsNewOperator(operatorId: string): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: claimed, error: claimErr } = await admin
      .from("operators")
      .update({ admin_notified_at: new Date().toISOString() })
      .eq("id", operatorId)
      .is("admin_notified_at", null)
      .select(
        "id, first_name, last_name, company_name, state, fleet_size, email, created_at"
      )
      .maybeSingle();

    if (claimErr) {
      console.error("[notify-admins-new-operator] claim failed", {
        operatorId,
        error: claimErr.message,
      });
      return;
    }
    if (!claimed) {
      // Already notified by a concurrent or prior caller. Nothing to do.
      return;
    }

    const { data: admins, error: adminErr } = await admin
      .from("admins")
      .select("email, full_name")
      .is("disabled_at", null);

    if (adminErr) {
      console.error("[notify-admins-new-operator] admin fetch failed", {
        operatorId,
        error: adminErr.message,
      });
      return;
    }
    if (!admins || admins.length === 0) {
      console.error("[notify-admins-new-operator] no active admins to notify", {
        operatorId,
      });
      return;
    }

    const payload: AdminNewOperatorPayload = {
      firstName: claimed.first_name,
      lastName: claimed.last_name,
      companyName: claimed.company_name,
      state: claimed.state,
      fleetSize: claimed.fleet_size,
      email: claimed.email,
      registeredAt: new Date(claimed.created_at),
    };

    const subject = buildAdminNewOperatorSubject(payload);
    const html = buildAdminNewOperatorHtml(payload);
    const text = buildAdminNewOperatorText(payload);

    const resend = getResend();

    await Promise.allSettled(
      admins.map(async (a) => {
        try {
          const result = await resend.emails.send({
            from: FROM,
            to: a.email,
            subject,
            html,
            text,
          });
          if (result.error) {
            console.error("[notify-admins-new-operator] send error", {
              operatorId,
              adminEmail: a.email,
              error: result.error,
            });
          }
        } catch (err) {
          console.error("[notify-admins-new-operator] send threw", {
            operatorId,
            adminEmail: a.email,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })
    );
  } catch (err) {
    console.error("[notify-admins-new-operator] unexpected failure", {
      operatorId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
