import "server-only";

export type AdminNewOperatorPayload = {
  firstName: string;
  lastName: string;
  companyName: string;
  state: string;
  fleetSize: string;
  email: string;
  registeredAt: Date;
};

const ADMIN_URL = "https://www.towgrade.com/admin";

export function buildAdminNewOperatorSubject(p: AdminNewOperatorPayload): string {
  return `New TowGrade operator pending verification: ${p.companyName}`;
}

function formatRegisteredAt(d: Date): string {
  // e.g. "April 30, 2026 at 4:23 PM EDT" — Eastern timezone with DST-aware abbreviation.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).formatToParts(d);

  const get = (type: string) => parts.find((x) => x.type === type)?.value ?? "";
  const date = `${get("month")} ${get("day")}, ${get("year")}`;
  const time = `${get("hour")}:${get("minute")} ${get("dayPeriod")}`;
  const tz = get("timeZoneName");
  return `${date} at ${time} ${tz}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildAdminNewOperatorHtml(p: AdminNewOperatorPayload): string {
  const firstName = escapeHtml(p.firstName);
  const lastName = escapeHtml(p.lastName);
  const companyName = escapeHtml(p.companyName);
  const state = escapeHtml(p.state);
  const fleetSize = escapeHtml(p.fleetSize);
  const email = escapeHtml(p.email);
  const registeredAt = escapeHtml(formatRegisteredAt(p.registeredAt));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>New TowGrade operator pending verification</title>
</head>
<body style="margin:0;padding:0;background-color:#FAFBFC;font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;color:#0E1117;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAFBFC;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#FFFFFF;border:1px solid #CDD4DF;border-radius:6px;">

          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #E8ECF1;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;color:#0E1117;letter-spacing:-0.01em;">TowGrade</div>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 8px;">
              <div style="font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;color:#1A56C4;text-transform:uppercase;margin-bottom:12px;">Operator Intelligence</div>
              <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;line-height:1.3;color:#0E1117;margin:0 0 16px;">New operator pending verification</h1>
              <p style="font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#3A4358;margin:0 0 24px;">A newly-registered operator has confirmed their email and is awaiting verification before their reviews count toward public aggregate scores.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #E8ECF1;border-bottom:1px solid #E8ECF1;">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #F4F6F8;font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#64718A;text-transform:uppercase;letter-spacing:0.08em;width:140px;vertical-align:top;">Name</td>
                  <td style="padding:12px 0;border-bottom:1px solid #F4F6F8;font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;color:#0E1117;font-weight:500;">${firstName} ${lastName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #F4F6F8;font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#64718A;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;">Company</td>
                  <td style="padding:12px 0;border-bottom:1px solid #F4F6F8;font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;color:#0E1117;font-weight:500;">${companyName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #F4F6F8;font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#64718A;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;">State</td>
                  <td style="padding:12px 0;border-bottom:1px solid #F4F6F8;font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;color:#0E1117;font-weight:500;">${state}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #F4F6F8;font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#64718A;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;">Fleet size</td>
                  <td style="padding:12px 0;border-bottom:1px solid #F4F6F8;font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;color:#0E1117;font-weight:500;">${fleetSize}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #F4F6F8;font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#64718A;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;">Email</td>
                  <td style="padding:12px 0;border-bottom:1px solid #F4F6F8;font-family:Consolas,'Courier New',monospace;font-size:14px;color:#0E1117;">${email}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#64718A;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;">Registered</td>
                  <td style="padding:12px 0;font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;color:#0E1117;font-weight:500;">${registeredAt}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 16px;" align="left">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#1A56C4;border-radius:4px;">
                    <a href="${ADMIN_URL}" style="display:inline-block;padding:14px 28px;font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;letter-spacing:0.01em;">Review in admin queue</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 32px;">
              <p style="font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#64718A;margin:0;">Or paste this URL into your browser:<br><span style="font-family:Consolas,'Courier New',monospace;color:#3A4358;">${ADMIN_URL}</span></p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px;background-color:#F4F6F8;border-top:1px solid #E8ECF1;border-bottom-left-radius:6px;border-bottom-right-radius:6px;">
              <p style="font-family:Calibri,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#64718A;margin:0;">You received this notification because you are an administrator on TowGrade. Operator details are confidential — handle accordingly.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildAdminNewOperatorText(p: AdminNewOperatorPayload): string {
  const registeredAt = formatRegisteredAt(p.registeredAt);
  return [
    "TowGrade — Operator Intelligence",
    "",
    "New operator pending verification",
    "",
    "A newly-registered operator has confirmed their email and is awaiting verification before their reviews count toward public aggregate scores.",
    "",
    `Name:        ${p.firstName} ${p.lastName}`,
    `Company:     ${p.companyName}`,
    `State:       ${p.state}`,
    `Fleet size:  ${p.fleetSize}`,
    `Email:       ${p.email}`,
    `Registered:  ${registeredAt}`,
    "",
    `Review in admin queue: ${ADMIN_URL}`,
    "",
    "—",
    "You received this notification because you are an administrator on TowGrade. Operator details are confidential — handle accordingly.",
  ].join("\n");
}
