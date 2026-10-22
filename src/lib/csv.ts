/**
 * CSV for spreadsheets (RFC 4180), safe to open (docs/SCOPE.md §9.9).
 *
 * Two jobs. Quoting: a field holding a comma, quote or line break is wrapped
 * in quotes, with quotes doubled. Formula injection: a spreadsheet runs any
 * cell that starts with `=`, `+`, `-`, `@` (or a tab or carriage return) as a
 * formula, so a member who types `=HYPERLINK(…)` into a note could plant one
 * in the treasurer's workbook. Such cells are prefixed with `'`, which the
 * spreadsheet shows as text. Plain numbers are left alone — "-5.00" is a
 * reversal, not a formula, and must stay a number.
 */

const NUMBER = /^-?\d+(\.\d+)?$/;
const DANGEROUS = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (DANGEROUS.test(text) && !NUMBER.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Rows to a CSV document with CRLF line endings, as RFC 4180 specifies. */
export function toCsv(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
