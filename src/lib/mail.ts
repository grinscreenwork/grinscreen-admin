import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Sends mail through Gmail SMTP using an App Password.
 *   GMAIL_USER          the sending address (e.g. grinscreen.work@gmail.com)
 *   GMAIL_APP_PASSWORD  a 16-character Google App Password (NOT the normal Gmail password)
 */
export function mailConfigured(): boolean {
  return !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
}

export function senderAddress(): string | undefined {
  return process.env.GMAIL_USER;
}

let transporter: Transporter | null = null;

function transport() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "") },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

export type Mail = { to: string | string[]; subject: string; html: string; text: string; replyTo?: string };

export async function sendMail(mail: Mail): Promise<void> {
  if (!mailConfigured()) throw new Error("Email isn't configured (GMAIL_USER / GMAIL_APP_PASSWORD).");
  await transport().sendMail({
    from: { name: "GrinScreen", address: process.env.GMAIL_USER! },
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    replyTo: mail.replyTo,
  });
}

/** Turn a raw SMTP error into something a person can act on (and never leak credentials). */
export function friendlyMailError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/535|invalid login|username and password not accepted|application-specific password/i.test(msg))
    return "Gmail rejected the login. Check GMAIL_USER and that GMAIL_APP_PASSWORD is a valid App Password (needs 2-Step Verification on).";
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|timeout/i.test(msg)) return "Couldn't reach Gmail. Check the internet connection and try again.";
  if (/not configured/i.test(msg)) return msg;
  return "Gmail couldn't send the message. Please try again.";
}
