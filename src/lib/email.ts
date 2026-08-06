import "server-only";

import { Resend } from "resend";

import { env } from "@/lib/env";

export const resend = new Resend(env.RESEND_API_KEY);

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

/**
 * Thin wrapper so every outbound email goes through one place — the from
 * address, error handling and (later) logging live here rather than at each
 * call site.
 */
export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailInput) {
  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
    replyTo,
  });

  if (error) {
    throw new Error(`Failed to send email "${subject}": ${error.message}`);
  }

  return data;
}
