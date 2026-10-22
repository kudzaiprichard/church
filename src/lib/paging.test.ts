import { describe, expect, it } from "vitest";

import { pageNumbers, pageWindow, paginate, parsePaging } from "./paging";

describe("parsePaging", () => {
  it("reads a chosen page and size", () => {
    expect(parsePaging({ page: "3", size: "10" })).toEqual({ page: 3, size: 10 });
  });

  it("falls back for anything that is not one of the choices", () => {
    expect(parsePaging({ page: "-2", size: "7" }, 25)).toEqual({ page: 1, size: 25 });
    expect(parsePaging({ page: "abc", size: ["10", "20"] })).toEqual({ page: 1, size: 20 });
    expect(parsePaging({ page: "2.9" })).toEqual({ page: 2, size: 20 });
  });
});

describe("pageWindow", () => {
  it("gives skip and take for a query", () => {
    expect(pageWindow({ page: 3, size: 10 })).toEqual({ skip: 20, take: 10 });
  });
});

describe("paginate", () => {
  const rows = Array.from({ length: 23 }, (_, i) => i + 1);

  it("slices one page and counts the pages", () => {
    const page = paginate(rows, { page: 2, size: 10 });
    expect(page.rows).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(page).toMatchObject({ page: 2, pageCount: 3, total: 23, size: 10 });
  });

  it("shows the last page rather than nothing when asked past the end", () => {
    const page = paginate(rows, { page: 9, size: 10 });
    expect(page.page).toBe(3);
    expect(page.rows).toEqual([21, 22, 23]);
  });

  it("keeps one empty page for an empty list", () => {
    expect(paginate([], { page: 1, size: 5 })).toMatchObject({ rows: [], page: 1, pageCount: 1 });
  });
});

describe("pageNumbers", () => {
  it("shows every page when there are few", () => {
    expect(pageNumbers(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it("keeps the ends and the neighbours, marking the gaps", () => {
    expect(pageNumbers(10, 20)).toEqual([1, null, 8, 9, 10, 11, 12, null, 20]);
    expect(pageNumbers(1, 20)).toEqual([1, 2, 3, null, 20]);
  });
});

describe("a second list on the same page", () => {
  it("reads its own keys and ignores the first list's", () => {
    const params = { page: "3", size: "10", ppage: "2", psize: "5" };
    expect(parsePaging(params, 20, { page: "ppage", size: "psize" })).toEqual({ page: 2, size: 5 });
    expect(parsePaging(params)).toEqual({ page: 3, size: 10 });
  });
});
