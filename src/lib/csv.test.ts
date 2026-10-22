import { describe, expect, it } from "vitest";

import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("quotes commas, quotes and line breaks, doubling quotes", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "amen"')).toBe('"say ""amen"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
  });

  it("defuses anything a spreadsheet would run as a formula", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell("+1+1")).toBe("'+1+1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("-2+3")).toBe("'-2+3");
    expect(csvCell("\tcmd")).toBe("'\tcmd");
  });

  it("leaves plain numbers, negatives included, as numbers", () => {
    expect(csvCell("-5.00")).toBe("-5.00");
    expect(csvCell(12)).toBe("12");
  });

  it("writes empty for missing values", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
});

describe("toCsv", () => {
  it("joins rows with CRLF and ends with one", () => {
    expect(toCsv([["a", "b"], ["1", "x,y"]])).toBe('a,b\r\n1,"x,y"\r\n');
  });
});
