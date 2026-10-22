import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

import { notificationRows, type NotifyInput } from "./notification-rows";

export type { NotifyInput } from "./notification-rows";

/**
 * The one way anything in the portal tells somebody something
 * (docs/SCOPE.md §5.4).
 *
 * The rows are written inside the caller's transaction, so a message and the
 * notifications announcing it stand or fall together. Email is different: it
 * cannot be rolled back, so it is never sent from inside the transaction.
 * `notify` returns a `deliver` function instead, which the caller runs after
 * the commit:
 *
 *     const deliver = await prisma.$transaction(async (tx) => {
 *       …write the change…
 *       return notify(tx, { userIds, type: "MESSAGE", title, email: true });
 *     });
 *     await deliver();
 *
 * `deliver` never throws. A failed email is logged and forgotten — the
 * notification is already in the bell, and an outage at the mail provider must
 * not turn into an error on a form that has in fact succeeded.
 */
export async function notify(
  tx: Prisma.TransactionClient,
  input: NotifyInput,
): Promise<() => Promise<void>> {
  const rows = notificationRows(input);
  if (rows.length > 0) await tx.notification.createMany({ data: rows, skipDuplicates: true });

  if (!input.email || rows.length === 0) return async () => {};

  const userIds = rows.map((row) => row.userId);
  const { title, body } = rows[0];
  const link = rows[0].linkUrl ? new URL(rows[0].linkUrl, env.APP_URL).toString() : env.APP_URL;

  return async () => {
    try {
      const recipients = await prisma.user.findMany({
        where: { id: { in: userIds }, isActive: true },
        select: { email: true, firstName: true },
      });
      const { sendEmail } = await import("@/lib/email");

      // One email each, never one with everybody in `to`: a group's members
      // would otherwise receive one another's addresses.
      for (const recipient of recipients) {
        const mail = notificationEmail({ firstName: recipient.firstName, title, body, link });
        await sendEmail({ to: recipient.email, ...mail }).catch((error: unknown) => {
          console.error("[notify] Could not email a notification:", error);
        });
      }
    } catch (error) {
      console.error("[notify] Could not send notification emails:", error);
    }
  };
}

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );

/**
 * The email form of a notification: its title and summary, and a link into the
 * portal for the rest. The full text stays behind the sign-in — an inbox is a
 * worse place to keep a pastoral message than the portal is.
 */
function notificationEmail({
  firstName,
  title,
  body,
  link,
}: {
  firstName: string;
  title: string;
  body: string | null;
  link: string;
}) {
  const text = [
    `Hello ${firstName},`,
    "",
    title,
    ...(body ? ["", body] : []),
    "",
    "Read it in the church portal:",
    link,
  ].join("\n");

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#2a1f24">${[
    `<p>Hello ${escape(firstName)},</p>`,
    `<p style="font-weight:600">${escape(title)}</p>`,
    ...(body ? [`<p>${escape(body)}</p>`] : []),
    `<p><a href="${escape(link)}" style="color:#5d2745;font-weight:600">Read it in the church portal</a></p>`,
  ].join("")}</div>`;

  return { subject: title, text, html };
}
