import { describe, expect, it } from "vitest";

import { chemaGrid, chemaStatus, complianceRow, compliance, expectedChema } from "./chema";
import { amountSchema, formatMoney, fromCents, sumCents, toCents } from "./money";
import { pledgeState, progress } from "./pledges";
import { paymentSchema, projectSchema } from "./schema";
import { byGroup, byMonth, summarise } from "./totals";

describe("expectedChema", () => {
  it("is $5.00 in January and $1.00 in each other month", () => {
    expect(expectedChema(1)).toBe(500);
    for (let month = 2; month <= 12; month += 1) expect(expectedChema(month)).toBe(100);
  });

  it("refuses anything that is not a month", () => {
    for (const bad of [0, 13, 1.5, -1]) expect(() => expectedChema(bad)).toThrow();
  });
});

describe("chemaStatus and compliance", () => {
  it("counts only a confirmed, unreversed chema as paid", () => {
    expect(chemaStatus([{ status: "CONFIRMED", reversed: false }])).toBe("PAID");
    expect(chemaStatus([{ status: "PENDING", reversed: false }])).toBe("PENDING");
    expect(chemaStatus([{ status: "REJECTED", reversed: false }])).toBe("UNPAID");
    expect(chemaStatus([{ status: "CONFIRMED", reversed: true }])).toBe("UNPAID");
    expect(chemaStatus([])).toBe("UNPAID");
  });

  it("lets a fresh log after a rejection show as pending", () => {
    expect(
      chemaStatus([
        { status: "REJECTED", reversed: false },
        { status: "PENDING", reversed: false },
      ]),
    ).toBe("PENDING");
  });

  it("reports paid over expected, and no rate for nobody", () => {
    expect(compliance(["PAID", "UNPAID", "PENDING", "PAID"])).toEqual({
      paid: 2,
      total: 4,
      rate: 0.5,
    });
    expect(compliance([]).rate).toBeNull();
  });

  it("greys out the months still to come", () => {
    const grid = chemaGrid(2026, new Map([[1, [{ status: "CONFIRMED", reversed: false }]]]), {
      year: 2026,
      month: 10,
    });
    expect(grid).toHaveLength(12);
    expect(grid[0].status).toBe("PAID");
    expect(grid[9].status).toBe("UNPAID");
    expect(grid[10].status).toBe("FUTURE");
  });
});

describe("complianceRow — what a leader sees", () => {
  it("carries the expected chema, a status and a date, and no other amount", () => {
    const row = complianceRow({ id: "m", name: "Farai", groups: ["Youth Alive"] }, 1, [
      { status: "CONFIRMED", reversed: false, paidAt: "2026-01-04" },
    ]);
    expect(Object.keys(row).sort()).toEqual([
      "expectedCents",
      "groups",
      "member",
      "paidAt",
      "status",
    ]);
    expect(row).toMatchObject({ expectedCents: 500, status: "PAID", paidAt: "2026-01-04" });
    expect(Object.keys(row.member).sort()).toEqual(["id", "name"]);
  });

  it("gives no date for anything but a paid month", () => {
    expect(complianceRow({ id: "m", name: "x", groups: [] }, 3, []).paidAt).toBeNull();
  });
});

describe("money", () => {
  it("converts exactly between Decimal strings and cents", () => {
    expect(toCents("12.5")).toBe(1250);
    expect(toCents("0.07")).toBe(7);
    expect(toCents("-5.00")).toBe(-500);
    expect(fromCents(1250)).toBe("12.50");
    expect(fromCents(-7)).toBe("-0.07");
  });

  it("adds without float drift", () => {
    expect(sumCents([toCents("0.10"), toCents("0.20")])).toBe(30);
    expect(formatMoney(30)).toContain("0.30");
  });

  it("accepts only positive amounts with up to two decimals", () => {
    expect(amountSchema.safeParse("25").success).toBe(true);
    expect(amountSchema.safeParse("12.50").success).toBe(true);
    for (const bad of ["0", "-3", "1.234", "abc", ""]) {
      expect(amountSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("totals count CONFIRMED only", () => {
  const rows = [
    { type: "TITHE" as const, status: "CONFIRMED" as const, cents: 2000 },
    { type: "TITHE" as const, status: "PENDING" as const, cents: 999 },
    { type: "CHEMA" as const, status: "CONFIRMED" as const, cents: 500 },
    { type: "WELFARE" as const, status: "REJECTED" as const, cents: 300 },
    { type: "TITHE" as const, status: "CONFIRMED" as const, cents: -500 },
  ];

  it("sums confirmed rows, reversals included, and keeps pending apart", () => {
    const totals = summarise(rows);
    expect(totals.confirmed.TITHE).toBe(1500);
    expect(totals.confirmed.WELFARE).toBe(0);
    expect(totals.total).toBe(2000);
    expect(totals.pending.TITHE).toBe(999);
    expect(totals.pendingTotal).toBe(999);
  });

  it("gives the charts the same total as the table", () => {
    const dated = rows.map((row, index) => ({
      ...row,
      paidAt: `2026-0${(index % 2) + 1}-15`,
      groups: index === 0 ? ["Youth Alive", "Hosting"] : [],
    }));
    const monthly = byMonth(dated).reduce((sum, entry) => sum + entry.cents, 0);
    expect(monthly).toBe(summarise(rows).total);
    // A member in two groups counts toward each group's bar.
    expect(byGroup(dated).map((entry) => entry.group)).toEqual([
      "Hosting",
      "No group",
      "Youth Alive",
    ]);
  });
});

describe("pledges", () => {
  const base = { status: "ACTIVE" as const, totalCents: 10000, dueDate: "2026-11-01" };

  it("derives fulfilled and overdue rather than storing them", () => {
    expect(pledgeState({ ...base, paidCents: 10000 }, "2026-10-22")).toBe("FULFILLED");
    expect(pledgeState({ ...base, paidCents: 500 }, "2026-10-22")).toBe("ACTIVE");
    expect(pledgeState({ ...base, paidCents: 500 }, "2026-11-02")).toBe("OVERDUE");
    expect(pledgeState({ ...base, status: "CANCELLED", paidCents: 0 }, "2026-11-02")).toBe(
      "CANCELLED",
    );
  });

  it("caps the bar but keeps the real figure", () => {
    expect(progress(15000, 10000)).toEqual({ real: 1.5, shown: 1 });
    expect(progress(0, 0)).toEqual({ real: 0, shown: 0 });
  });
});

describe("paymentSchema", () => {
  const today = new Date().toISOString().slice(0, 10);

  it("needs the month for chema and an amount for everything else", () => {
    expect(paymentSchema.safeParse({ type: "CHEMA", paidAt: today }).success).toBe(false);
    expect(
      paymentSchema.safeParse({ type: "CHEMA", paidAt: today, chemaYear: "2026", chemaMonth: "1" })
        .success,
    ).toBe(true);
    expect(paymentSchema.safeParse({ type: "TITHE", paidAt: today }).success).toBe(false);
    expect(paymentSchema.safeParse({ type: "TITHE", paidAt: today, amount: "20" }).success).toBe(
      true,
    );
  });

  it("needs a project for partnership giving and refuses a future date", () => {
    expect(
      paymentSchema.safeParse({ type: "PARTNERSHIP", paidAt: today, amount: "5" }).success,
    ).toBe(false);
    expect(
      paymentSchema.safeParse({ type: "TITHE", paidAt: "2999-01-01", amount: "5" }).success,
    ).toBe(false);
  });

  it("checks a project's end is not before its start", () => {
    const project = { name: "Roof", targetAmount: "500", startDate: "2026-02-01" };
    expect(projectSchema.safeParse({ ...project, endDate: "2026-01-01" }).success).toBe(false);
    expect(projectSchema.safeParse(project).success).toBe(true);
  });
});
