import { z } from "zod";

/**
 * Money, exactly (docs/SCOPE.md §5.3).
 *
 * The database stores `Decimal(12,2)`. In code an amount is carried as whole
 * cents — an integer, so adding a column of them never drifts the way binary
 * floats do — and converted at the edges: from the Decimal's string on the way
 * in, to "12.50" for the database and "$12.50" for people on the way out.
 * Twelve digits of cents is far inside a JavaScript integer's exact range.
 */

export type Cents = number;

const AMOUNT = /^(-?)(\d{1,10})(?:\.(\d{1,2}))?$/;

/** "12.5", "12.50" or a Prisma Decimal's `toString()` → 1250. */
export function toCents(value: string | { toString(): string }): Cents {
  const match = AMOUNT.exec(String(value).trim());
  if (!match) throw new Error(`Not an amount: ${String(value)}`);
  const [, sign, whole, fraction = ""] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return sign ? -cents : cents;
}

/** 1250 → "12.50", the form Prisma writes to a Decimal column. */
export function fromCents(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

const usd = new Intl.NumberFormat("en-ZW", { style: "currency", currency: "USD" });

/** 1250 → "US$12.50" in the church's locale. */
export function formatMoney(cents: Cents): string {
  return usd.format(cents / 100);
}

export function sumCents(values: Iterable<Cents>): Cents {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

const TYPED = /^\d{1,9}(\.\d{1,2})?$/;

/** A positive amount typed into a form: up to two decimals, under a billion. */
export const amountSchema = z
  .string({ error: "Enter an amount." })
  .trim()
  .regex(TYPED, "Enter an amount such as 25 or 12.50.")
  // Zod runs every check even after one fails, so this one guards itself.
  .refine((value) => !TYPED.test(value) || toCents(value) > 0, "Enter an amount above zero.");
