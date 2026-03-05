/**
 * Email module — sends confirmation emails via Resend.com
 *
 * Two functions:
 * - sendConfirmationEmail: After profile submission, sends edit link
 * - sendUpdateConfirmationEmail: After profile update, confirms changes
 *
 * Error handling: If Resend returns an error object (not throw), it's logged
 * with status code and message. Errors are re-thrown so callers know to handle.
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// FROM address: wrap bare email with display name for nicer inbox presentation
// Fallback: noreply@britaroma.com (a verified Resend domain)
const _fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@britaroma.com';
const FROM = _fromEmail.includes('<') ? _fromEmail : `Talent Connect <${_fromEmail}>`;

// App URL for edit links in emails
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Send confirmation email after a new profile is submitted.
 */
export async function sendConfirmationEmail({ name, email, editToken }) {
  const editLink = `${APP_URL}/edit/${editToken}`;
  const firstName = name?.split(' ')[0] || 'there';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're in — Talent Connect</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8 0%,#6d28d9 100%);padding:40px 48px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.7);">TALENT CONNECT</p>
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.2;">You're in the network! 🎉</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
                Hi <strong>${firstName}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
                Thanks for joining our global part-time consulting network. Your profile has been received and will be reviewed shortly.
              </p>
              <p style="margin:0 0 32px;font-size:16px;color:#374151;line-height:1.6;">
                Our consultant partners work with clients across the <strong>UK, Europe, USA, and Middle East</strong> — we'll be in touch when a project matches your skills and availability.
              </p>

              <!-- Update link box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin:0 0 32px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1d4ed8;">Need to update your profile?</p>
                    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
                      Changed jobs, learned something new, or your availability shifted? Keep your profile fresh — it only takes a minute.
                    </p>
                    <a href="${editLink}"
                       style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
                      Update My Profile →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">
                Save this email to keep your personal update link. The link is unique to you.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9;padding:24px 48px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
                Talent Connect — Powered by AI &nbsp;·&nbsp; This profile was collected and processed using Claude AI
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hi ${firstName},

Thanks for joining Talent Connect!

Your profile has been received and will be reviewed by our consultant partners who work with clients across the UK, Europe, USA, and Middle East.

Need to update your profile later? Use your personal link:
${editLink}

Save this email — the link above is unique to you.

— Talent Connect (Powered by Claude AI)`;

  console.log(`[email] Sending confirmation → to=${email} from=${FROM}`);
  const result = await resend.emails.send({
    from: FROM,
    to:   email,
    subject: `You're in the network, ${firstName}! 🎉`,
    html,
    text,
  });
  if (result?.error) {
    console.error(`[email] Confirmation FAILED ✗ to=${email} status=${result.error.statusCode} msg="${result.error.message}"`);
    throw new Error(`Resend error ${result.error.statusCode}: ${result.error.message}`);
  }
  console.log(`[email] Confirmation sent ✓ id=${result?.data?.id ?? 'unknown'} to=${email}`);
}

/**
 * Send a confirmation email after a profile update.
 */
export async function sendUpdateConfirmationEmail({ name, email, editToken }) {
  const editLink  = `${APP_URL}/edit/${editToken}`;
  const firstName = name?.split(' ')[0] || 'there';

  console.log(`[email] Sending update confirmation → to=${email} from=${FROM}`);
  const result = await resend.emails.send({
    from: FROM,
    to:   email,
    subject: `Profile updated — Talent Connect`,
    html: `
<p style="font-family:Arial,sans-serif;font-size:16px;color:#374151;">
  Hi <strong>${firstName}</strong>,<br><br>
  Your Talent Connect profile has been updated successfully. ✅<br><br>
  You can always make further changes using your personal link:<br>
  <a href="${editLink}" style="color:#1d4ed8;">${editLink}</a><br><br>
  — Talent Connect
</p>`,
    text: `Hi ${firstName},\n\nYour Talent Connect profile has been updated. ✅\n\nTo make further changes: ${editLink}\n\n— Talent Connect`,
  });
  if (result?.error) {
    console.error(`[email] Update confirmation FAILED ✗ to=${email} status=${result.error.statusCode} msg="${result.error.message}"`);
    throw new Error(`Resend error ${result.error.statusCode}: ${result.error.message}`);
  }
  console.log(`[email] Update confirmation sent ✓ id=${result?.data?.id ?? 'unknown'} to=${email}`);
}
