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
  if (!mailConfigured()) throw new Error("not configured");
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
    return "The email account couldn't be signed in to, so nothing was sent. Please ask your developer to check the email setup.";
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|timeout/i.test(msg)) return "Couldn't reach the email service. Please try again in a moment.";
  if (/not configured/i.test(msg)) return "Email sending isn't set up yet. Please ask your developer to finish the email setup.";
  return "The email couldn't be sent. Please try again.";
}
