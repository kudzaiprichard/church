/**
 * Result shape for the own-profile form. Kept out of `actions.ts` because a
 * `"use server"` module may only export async functions.
 */
export type ProfileFormState = {
  fieldErrors?: Record<string, string>;
  /** What was typed, sent back on failure so the form can be refilled. */
  values?: Record<"phone" | "address" | "dateOfBirth" | "gender", string | undefined>;
  done?: boolean;
  /** Changes on every submission, so the form remounts with fresh defaults. */
  attempt?: number;
};

export const profileIdleState: ProfileFormState = {};
