import { enrolmentSchema, type EnrolmentInput } from "./schema";

/**
 * Reading the church's existing member list (docs/IMPLEMENTATION_PLAN.md,
 * Phase 6) — pure, so the rules are unit tested before anyone's real data
 * goes through them. A CSV is read as it is; an Excel sheet is turned into
 * the same text first (`cellText`, `encodeCsv`), so both meet one set of rules.
 *
 * Every row goes through the same `enrolmentSchema` as the enrolment form, so
 * an imported member meets exactly the rules a hand-enrolled one does: a
 * baptism date, place and minister are required, the email must be new, and
 * at least one connect group must be named.
 */

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

/** The inverse of `parseCsv`: quotes only the fields that need it, and changes nothing else. */
export function encodeCsv(rows: readonly (readonly string[])[]): string {
  const field = (value: string) =>
    /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  return rows.map((row) => row.map(field).join(",")).join("\r\n") + "\r\n";
}

/**
 * One cell of an Excel sheet as the text a CSV of it would hold. A cell
 * formatted as a date arrives as a Date at UTC midnight of that day, so its
 * UTC calendar date is the date that was typed; a number (a phone typed into a
 * number cell) arrives as a number. Empty cells are null.
 */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

/** The largest spreadsheet the import reads, before it is turned into text. */
export const XLSX_MAX_BYTES = 5_000_000;

/** The columns the template uses, and the spellings people actually type. */
const COLUMNS: Record<string, keyof RawRow> = {
  first_name: "firstName",
  firstname: "firstName",
  last_name: "lastName",
  lastname: "lastName",
  surname: "lastName",
  email: "email",
  phone: "phone",
  address: "address",
  date_of_birth: "dateOfBirth",
  dob: "dateOfBirth",
  birthday: "dateOfBirth",
  gender: "gender",
  groups: "groups",
  connect_groups: "groups",
  baptism_date: "baptismDate",
  baptism_location: "baptismLocation",
  conducted_by: "conductedBy",
  class_completed_on: "classCompletedOn",
  notes: "baptismNotes",
};

export const TEMPLATE_HEADER =
  "first_name,last_name,email,phone,address,date_of_birth,gender,groups,baptism_date,baptism_location,conducted_by,class_completed_on,notes";

type RawRow = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  groups?: string;
  baptismDate?: string;
  baptismLocation?: string;
  conductedBy?: string;
  classCompletedOn?: string;
  baptismNotes?: string;
};

/** "25/12/1990" or "1990-12-25" → "1990-12-25"; anything else as it was, for the schema to reject. */
export function normaliseDate(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return trimmed;
}

function normaliseGender(value: string | undefined) {
  const v = value?.trim().toLowerCase();
  if (!v) return undefined;
  if (v === "f" || v === "female") return "FEMALE";
  if (v === "m" || v === "male") return "MALE";
  return value;
}

export type ImportProblem = { line: number; email: string | null; errors: string[] };

export type ImportPlan = {
  ready: { line: number; input: EnrolmentInput }[];
  problems: ImportProblem[];
  unknownColumns: string[];
};

/**
 * Check every row and say which can be enrolled and what is wrong with the
 * rest. `groups` maps group names (any case) to ids; `existingEmails` are the
 * addresses already on the roll. Nothing is written here.
 */
export function planImport(
  rows: string[][],
  groups: ReadonlyMap<string, string>,
  existingEmails: ReadonlySet<string>,
): ImportPlan {
  const [header = [], ...body] = rows;
  const keys = header.map((cell) => COLUMNS[cell.trim().toLowerCase().replace(/\s+/g, "_")]);
  const unknownColumns = header.filter((_, index) => !keys[index]).map((cell) => cell.trim());

  const seen = new Map<string, number>();
  const plan: ImportPlan = { ready: [], problems: [], unknownColumns };

  body.forEach((cells, index) => {
    const line = index + 2;
    const raw: RawRow = {};
    keys.forEach((key, column) => {
      if (key) raw[key] = cells[column]?.trim();
    });

    const errors: string[] = [];
    const groupNames = (raw.groups ?? "")
      .split(/[;|]/)
      .map((name) => name.trim())
      .filter(Boolean);
    const groupIds = groupNames.map((name) => {
      const id = groups.get(name.toLowerCase());
      if (!id) errors.push(`Unknown connect group "${name}".`);
      return id ?? "";
    });

    const parsed = enrolmentSchema.safeParse({
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email,
      phone: raw.phone,
      address: raw.address,
      dateOfBirth: normaliseDate(raw.dateOfBirth),
      gender: normaliseGender(raw.gender),
      role: "MEMBER",
      groupIds: groupIds.filter(Boolean),
      baptismDate: normaliseDate(raw.baptismDate),
      baptismLocation: raw.baptismLocation,
      conductedBy: raw.conductedBy,
      classCompletedOn: normaliseDate(raw.classCompletedOn),
      baptismNotes: raw.baptismNotes,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "groupIds" && groupNames.length > 0) continue;
        errors.push(issue.message);
      }
    }

    const email = parsed.success ? parsed.data.email : (raw.email?.trim().toLowerCase() ?? null);
    if (email && existingEmails.has(email)) errors.push("Already on the roll.");
    if (email && seen.has(email)) errors.push(`Same email as line ${seen.get(email)}.`);
    if (email) seen.set(email, line);

    if (errors.length > 0 || !parsed.success) {
      plan.problems.push({ line, email: email || null, errors: [...new Set(errors)] });
    } else {
      plan.ready.push({ line, input: parsed.data });
    }
  });

  return plan;
}
