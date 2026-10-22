/**
 * Result shape for the prayer request form. Kept out of `actions.ts` because
 * a `"use server"` module may only export async functions.
 */
export type PrayerFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** What was typed, sent back on failure so the form can be refilled. */
  body?: string;
  done?: boolean;
  /** Changes on every submission, so the form remounts. */
  attempt?: number;
};

export const prayerIdleState: PrayerFormState = {};
