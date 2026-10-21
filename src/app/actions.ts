"use server";

import { z } from "zod";

import { services } from "@/lib/church";
import { getChurchInfo } from "@/lib/settings";

/**
 * What the form gets back. `values` is echoed so a rejected submission can be
 * re-rendered with the visitor's words still in it — retyping a message
 * because one field was wrong is the fastest way to lose them.
 */
export type FormState = {
  status: "idle" | "error" | "sent";
  message?: string;
  errors?: Partial<Record<"name" | "email" | "service" | "note", string>>;
  values?: { name: string; email: string; service: string; note: string };
};

export const idleState: FormState = { status: "idle" };

const serviceChoices = [
  ...services.map((service) => `${service.day} ${service.time}`),
  "Not sure yet",
] as const;

const visitSchema = z.object({
  name: z.string().trim().min(2, "Please tell us what to call you.").max(80),
  email: z.email("That does not look like an email address."),
  service: z.enum(serviceChoices, "Choose one of the services."),
  note: z.string().trim().max(600, "Please keep this under 600 characters.").default(""),
});

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );

/**
 * Someone saying they intend to come on Sunday.
 *
 * The mail client is imported inside the handler rather than at module scope:
 * `lib/env` validates on import and throws when a key is missing, and that
 * would take the whole public page down at build time on a machine that has no
 * mail credentials. Loading it here keeps the failure where it belongs — at the
 * moment an email actually needs to be sent.
 */
export async function planVisit(_previous: FormState, formData: FormData): Promise<FormState> {
  // A field no person can see and every naive bot fills in.
  if (typeof formData.get("company") === "string" && formData.get("company") !== "") {
    return { status: "sent" };
  }

  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    service: String(formData.get("service") ?? ""),
    note: String(formData.get("note") ?? ""),
  };

  const parsed = visitSchema.safeParse(values);

  if (!parsed.success) {
    const errors: FormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !(field in errors)) {
        errors[field as keyof NonNullable<FormState["errors"]>] = issue.message;
      }
    }
    return { status: "error", errors, values };
  }

  const visitor = parsed.data;
  // The office's address is whatever Settings says today.
  const office = await getChurchInfo();

  try {
    if (!office.email) throw new Error("No church email is set in Settings.");
    const { sendEmail } = await import("@/lib/email");

    await sendEmail({
      to: office.email,
      replyTo: visitor.email,
      subject: `Planning a visit — ${visitor.name}`,
      text: [
        `${visitor.name} <${visitor.email}> is planning to visit.`,
        `Service: ${visitor.service}`,
        visitor.note ? `Note: ${visitor.note}` : "No note left.",
      ].join("\n"),
      html: [
        `<p><strong>${escapeHtml(visitor.name)}</strong> &lt;${escapeHtml(visitor.email)}&gt; is planning to visit.</p>`,
        `<p>Service: ${escapeHtml(visitor.service)}</p>`,
        visitor.note ? `<p>Note: ${escapeHtml(visitor.note)}</p>` : "<p>No note left.</p>",
      ].join(""),
    });
  } catch {
    // The visitor cannot fix a mail outage, so give them the phone number
    // rather than an apology.
    return {
      status: "error",
      values,
      message: office.phone
        ? `We could not send that just now. Please call the office on ${office.phone} and we will look out for you.`
        : "We could not send that just now. Please try again a little later.",
    };
  }

  return { status: "sent" };
}

const bulletinSchema = z.email("That does not look like an email address.");

/** The Friday bulletin. One field, same rules. */
export async function subscribeToBulletin(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  if (typeof formData.get("company") === "string" && formData.get("company") !== "") {
    return { status: "sent" };
  }

  const email = String(formData.get("email") ?? "");
  const parsed = bulletinSchema.safeParse(email);

  if (!parsed.success) {
    return { status: "error", errors: { email: parsed.error.issues[0].message } };
  }

  const office = await getChurchInfo();

  try {
    if (!office.email) throw new Error("No church email is set in Settings.");
    const { sendEmail } = await import("@/lib/email");

    await sendEmail({
      to: office.email,
      replyTo: parsed.data,
      subject: "Bulletin signup",
      text: `${parsed.data} asked to receive the weekly bulletin.`,
      html: `<p>${escapeHtml(parsed.data)} asked to receive the weekly bulletin.</p>`,
    });
  } catch {
    return {
      status: "error",
      message: office.email
        ? `We could not sign you up just now. Please email ${office.email}.`
        : "We could not sign you up just now. Please try again a little later.",
    };
  }

  return { status: "sent" };
}
