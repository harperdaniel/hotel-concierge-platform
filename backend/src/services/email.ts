import nodemailer from "nodemailer";

// ── SMTP transport ────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.domeneshop.no",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const FROM = process.env.SMTP_FROM || `"Hotel Concierge" <${process.env.SMTP_USER}>`;

// ── Welcome email content (HTML + plain text) ─────────

export interface WelcomeEmailParams {
  hotelName: string;
  guestName?: string;
  telegramDeepLink: string;
  to: string;
}

export function renderWelcomeEmail(params: WelcomeEmailParams): {
  subject: string;
  text: string;
  html: string;
} {
  const { hotelName, guestName, telegramDeepLink } = params;
  const greeting = guestName ? `Dear ${guestName}` : "Dear Guest";

  const subject = `Welcome to ${hotelName} — Your Personal Concierge`;

  const text = `${greeting},

Welcome to ${hotelName}! We're delighted to have you.

Your personal concierge is ready to help. Tap the link below to start chatting on Telegram:

${telegramDeepLink}

Don't have Telegram yet? Download it free at https://telegram.org/

Need a dinner reservation? Room service? Local recommendations? Just ask — your concierge is one tap away.

We hope you have a wonderful stay!

— The ${hotelName} Team
`;

  // Inline-styled HTML for max email-client compatibility
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">
            <tr>
              <td style="padding:32px 32px 24px;">
                <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">🏨 Welcome to ${escapeHtml(hotelName)}</h1>
                <p style="margin:0;font-size:14px;color:#6b7280;">Your personal AI concierge is ready</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px;font-size:15px;line-height:1.6;color:#374151;">
                <p style="margin:0 0 16px;">${escapeHtml(greeting)},</p>
                <p style="margin:0 0 16px;">We're delighted to have you. Need a dinner reservation, room service, or local recommendations? Your concierge is one tap away.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px 32px;">
                <a href="${escapeAttr(telegramDeepLink)}"
                   style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:600;font-size:16px;padding:14px 28px;border-radius:10px;text-decoration:none;">
                  💬 Talk to me on Telegram
                </a>
                <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">
                  Don't have Telegram?
                  <a href="https://telegram.org/" style="color:#2563eb;text-decoration:none;">Get it free</a> — takes 30 seconds.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;border-top:1px solid #e5e7eb;">
                <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">We hope you have a wonderful stay.</p>
                <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">— The ${escapeHtml(hotelName)} Team</p>
              </td>
            </tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
            If the button doesn't work, copy this link:<br />
            <span style="word-break:break-all;">${escapeHtml(telegramDeepLink)}</span>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

// ── Send welcome email ────────────────────────────────

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<{ messageId: string }> {
  const { subject, text, html } = renderWelcomeEmail(params);

  const info = await transporter.sendMail({
    from: FROM,
    to: params.to,
    subject,
    text,
    html,
  });

  return { messageId: info.messageId };
}

// ── HTML escape helpers ───────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
