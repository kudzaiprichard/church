import type { MemberFormValues } from "@/lib/members/schema";

import type { MemberDefaults } from "./member-fields";

/**
 * Result shape for the enrolment and member-edit forms. Kept out of
 * `actions.ts` because a `"use server"` module may only export async functions.
 */
export type MemberFormState = {
  error?: string;
  /** The member was enrolled but something non-fatal followed, such as mail failing. */
  warning?: string;
  /**
   * Shown only when the invitation email could not be sent, so the person who
   * enrolled them can pass the link on by hand. It is the same single-use,
   * expiring link the email would have carried, and it is only ever shown to
   * the leader who just created the account.
   */
  inviteUrl?: string;
  /** Keyed by form field name; the first problem with each field. */
  fieldErrors?: Record<string, string>;
  /** What was submitted, sent back on failure so the form can be refilled. */
  values?: MemberFormValues;
  /** Changes on every failed submission, so the form remounts with `values`. */
  attempt?: number;
  done?: boolean;
  /** The member just enrolled, for the "view their record" link. */
  memberId?: string;
  /**
   * Changes on every successful enrolment. The form is keyed on it, so React
   * remounts it and the fields come back empty ready for the next person —
   * which is the supported way to reset an uncontrolled form, rather than
   * reaching for a ref during render.
   */
  submissionId?: number;
};

export const memberIdleState: MemberFormState = {};

/**
 * Field defaults for a form being refilled after a failed submission: what
 * was typed wins over the stored record, which wins over nothing.
 */
export function refill(state: MemberFormState, stored: MemberDefaults = {}): MemberDefaults {
  const values = state.values;
  if (!values) return stored;

  return {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    phone: values.phone,
    address: values.address,
    dateOfBirth: values.dateOfBirth,
    gender: (values.gender || null) as MemberDefaults["gender"],
    role: (values.role || stored.role) as MemberDefaults["role"],
    groupIds: values.groupIds,
    baptism: {
      baptismDate: values.baptismDate ?? "",
      location: values.baptismLocation ?? "",
      conductedBy: values.conductedBy ?? "",
      classCompletedOn: values.classCompletedOn || null,
      notes: values.baptismNotes || null,
    },
  };
}
