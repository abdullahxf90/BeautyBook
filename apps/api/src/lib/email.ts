import { Resend } from "resend";
import { config } from "../config";
import { logger } from "./logger";

// Real transactional email via Resend. Dormant until RESEND_API_KEY is set —
// callers always keep their in-app notification as a fallback, so nothing
// breaks when email isn't configured.
const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

export const emailEnabled = () => resend !== null;

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Returns true if the email was accepted by Resend, false if email is disabled or failed. */
export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: config.emailFrom,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });
    if (error) {
      logger.warn("email", `Resend rejected message to ${to}`, { error: error.message });
      return false;
    }
    return true;
  } catch (err) {
    logger.error("email", `Failed to send email to ${to}`, { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

/** Minimal branded wrapper so every transactional email looks consistent. */
export function emailLayout(heading: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#FAF8F7;font-family:'Hanken Grotesk',Arial,sans-serif;color:#1C1C1C;">
    <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
      <div style="font-family:'Space Grotesk',Arial,sans-serif;font-size:22px;font-weight:600;letter-spacing:-.02em;">BeautyBook</div>
      <div style="height:1px;background:rgba(28,28,28,.08);margin:20px 0;"></div>
      <h1 style="font-family:'Space Grotesk',Arial,sans-serif;font-size:24px;font-weight:600;margin:0 0 16px;">${heading}</h1>
      <div style="font-size:15px;line-height:1.6;color:#575153;">${bodyHtml}</div>
      <div style="height:1px;background:rgba(28,28,28,.08);margin:28px 0 16px;"></div>
      <div style="font-size:12px;color:#9a9296;">BeautyBook — Find. Book. Glow. · Pakistan's beauty marketplace</div>
    </div>
  </body></html>`;
}
