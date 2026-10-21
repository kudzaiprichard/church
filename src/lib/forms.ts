import type { z } from "zod";

/**
 * The first message for each field, which is all a form has room to show.
 *
 * Shared by every Server Action that parses a form with Zod, so validation
 * errors reach the form as state rather than being thrown (SCOPE §5.3).
 */
export function fieldErrorsFrom(issues: readonly z.core.$ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in errors)) errors[key] = issue.message;
  }
  return errors;
}
