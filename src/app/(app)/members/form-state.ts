/**
 * Result shape for the invite form. Kept out of `actions.ts` because a
 * `"use server"` module may only export async functions.
 */
export type MemberFormState = {
  error?: string;
  /** The account was created but something non-fatal followed, such as mail failing. */
  warning?: string;
  /**
   * Shown only when the invitation email could not be sent, so the admin can
   * pass the link on by hand. It is the same single-use, expiring link the
   * email would have carried, and it is only ever shown to the administrator
   * who just created the account.
   */
  inviteUrl?: string;
  fieldErrors?: Partial<Record<"email" | "firstName" | "lastName" | "role", string>>;
  done?: boolean;
  /**
   * Changes on every successful send. The form is keyed on it, so React
   * remounts it and the fields come back empty ready for the next invitation —
   * which is the supported way to reset an uncontrolled form, rather than
   * reaching for a ref during render.
   */
  submissionId?: number;
};

export const memberIdleState: MemberFormState = {};
