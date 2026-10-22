import { describe, expect, it } from "vitest";

import { relativeTime } from "./dates";

describe("relativeTime", () => {
  // 10:00 in Harare (UTC+2).
  const now = new Date("2026-10-22T08:00:00.000Z");

  it("counts minutes, then hours within the same Harare day", () => {
    expect(relativeTime("2026-10-22T07:59:40.000Z", now)).toBe("Just now");
    expect(relativeTime("2026-10-22T07:48:00.000Z", now)).toBe("12 min ago");
    expect(relativeTime("2026-10-22T05:00:00.000Z", now)).toBe("3 h ago");
  });

  it("calls the previous Harare day Yesterday, even when UTC says otherwise", () => {
    // 23:30 on the 21st in Harare is 21:30 UTC on the 21st.
    expect(relativeTime("2026-10-21T21:30:00.000Z", now)).toBe("Yesterday");
    // 00:30 on the 22nd in Harare is still 22:30 UTC on the 21st.
    expect(relativeTime("2026-10-21T22:30:00.000Z", now)).toBe("9 h ago");
  });

  it("gives a date for anything older, with the year once it is a different one", () => {
    expect(relativeTime("2026-10-04T08:00:00.000Z", now)).toBe("4 Oct");
    expect(relativeTime("2025-03-04T08:00:00.000Z", now)).toBe("4 Mar 2025");
  });
});
