import "server-only";

import { Resend } from "resend";

import { emailIsConfigured, env } from "@/lib/env";

/**
 * Built on first use rather than at import.
 *
 * `lib/env` allows a missing `RESEND_API_KEY` outside production, and this
 * module is imported transitively by the auth pages — constructing the client
 * eagerly would make every developer without a Resend account hit an error on
 * a page that was not going to send anything.
 */
let client: Resend | null = null;

function resend() {
  client ??= new Resend(env.RESEND_API_KEY);
  return client;
}

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
  /**
   * No key configured, which `lib/env` only permits outside production. Print
   * the message instead of throwing: the flows that send mail here also create
   * an invitation or reset token, and failing the send would roll back work the
   * developer needs. The link they are after is in the text.
   */
  if (!emailIsConfigured) {
    console.info(
      [
        "",
        "┌─ email (not sent — RESEND_API_KEY is unset)",
        `│ to:      ${Array.isArray(to) ? to.join(", ") : to}`,
        `│ subject: ${subject}`,
        "└─",
        text ?? stripTags(html),
        "",
      ].join("\n"),
    );
    return null;
  }

  const { data, error } = await resend().emails.send({
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

/** Enough to make an HTML-only message readable in a terminal. */
function stripTags(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
