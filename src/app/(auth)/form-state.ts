/**
 * Shared shape for every auth form's result.
 *
 * Kept out of `actions.ts` because a `"use server"` module may only export
 * async functions — a plain constant in there is a build error.
 */
export type AuthFormState = {
  /** A problem with the submission as a whole. */
  error?: string;
  /** A problem with one field, keyed by its name. */
  fieldErrors?: Partial<Record<"email" | "password" | "confirm" | "current", string>>;
  /** Set when the action succeeded but stays on the page instead of redirecting. */
  done?: boolean;
};

export const authIdleState: AuthFormState = {};
