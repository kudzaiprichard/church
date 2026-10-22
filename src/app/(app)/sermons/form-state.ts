/**
 * Result shape for the sermon and devotion forms. Kept out of `actions.ts`
 * because a `"use server"` module may only export async functions.
 */
export type SermonFormState = {
  error?: string;
  /** Keyed by form field name; the first problem with each field. */
  fieldErrors?: Record<string, string>;
  /** What was typed, sent back on failure so the form can be refilled. */
  values?: Record<string, string>;
  /** Changes on every submission, so the form remounts with fresh defaults. */
  attempt?: number;
};

export const sermonIdleState: SermonFormState = {};
