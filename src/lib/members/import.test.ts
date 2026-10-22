import { describe, expect, it } from "vitest";

import { normaliseDate, parseCsv, planImport, TEMPLATE_HEADER } from "./import";

const groups = new Map([
  ["youth alive", "g-youth"],
  ["kingdom total women", "g-ktw"],
]);

const row = (cells: Record<string, string>) =>
  TEMPLATE_HEADER.split(",")
    .map((column) => cells[column] ?? "")
    .map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell))
    .join(",");

const good = {
  first_name: "Rudo",
  last_name: "Moyo",
  email: "Rudo@Example.org",
  groups: "Youth Alive",
  baptism_date: "14/03/2015",
  baptism_location: "Main sanctuary",
  conducted_by: "Apostle Takura James Makamba",
};

describe("parseCsv", () => {
  it("reads quoted fields, doubled quotes, commas and line breaks, and a byte-order mark", () => {
    expect(parseCsv('﻿a,b\r\n"x, ""y""","line\nbreak"\r\n\r\n')).toEqual([
      ["a", "b"],
      ['x, "y"', "line\nbreak"],
    ]);
  });
});

describe("normaliseDate", () => {
  it("accepts day/month/year as written in Zimbabwe, and ISO dates", () => {
    expect(normaliseDate("3/7/1990")).toBe("1990-07-03");
    expect(normaliseDate("1990-07-03")).toBe("1990-07-03");
    expect(normaliseDate(" ")).toBeUndefined();
  });
});

describe("planImport", () => {
  it("passes a complete row, lower-casing the email and resolving the group", () => {
    const plan = planImport(parseCsv(`${TEMPLATE_HEADER}\n${row(good)}`), groups, new Set());
    expect(plan.problems).toEqual([]);
    expect(plan.ready[0].input).toMatchObject({
      email: "rudo@example.org",
      groupIds: ["g-youth"],
      baptismDate: "2015-03-14",
    });
  });

  it("refuses a row without baptism, exactly as enrolment does", () => {
    const plan = planImport(
      parseCsv(`${TEMPLATE_HEADER}\n${row({ ...good, baptism_date: "" })}`),
      groups,
      new Set(),
    );
    expect(plan.ready).toEqual([]);
    expect(plan.problems[0].errors).toContain(
      "Baptism date is required. Only baptized members can be enrolled.",
    );
  });

  it("reports unknown groups, existing and repeated emails, by line", () => {
    const csv = [
      TEMPLATE_HEADER,
      row({ ...good, groups: "Choir" }),
      row({ ...good, email: "taken@example.org" }),
      row({ ...good, email: "twice@example.org" }),
      row({ ...good, email: "twice@example.org" }),
    ].join("\n");
    const plan = planImport(parseCsv(csv), groups, new Set(["taken@example.org"]));
    expect(plan.problems.map((problem) => [problem.line, problem.errors])).toEqual([
      [2, ['Unknown connect group "Choir".']],
      [3, ["Already on the roll."]],
      [5, ["Same email as line 4."]],
    ]);
    expect(plan.ready.map((entry) => entry.line)).toEqual([4]);
  });

  it("names columns it does not recognise, so a typo in the header is visible", () => {
    const plan = planImport(parseCsv("first_name,emial\nA,b"), groups, new Set());
    expect(plan.unknownColumns).toEqual(["emial"]);
  });
});
