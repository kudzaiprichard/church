import { describe, expect, it } from "vitest";

import {
  devotionStatus,
  paragraphs,
  parseTags,
  preacherName,
  publishedBy,
  sermonSchema,
} from "./rules";

describe("devotion scheduling, in Harare days", () => {
  const today = "2026-10-22";

  it("derives draft, scheduled and published from the date alone", () => {
    expect(devotionStatus(null, today)).toBe("DRAFT");
    expect(devotionStatus("2026-10-23", today)).toBe("SCHEDULED");
    expect(devotionStatus("2026-10-22", today)).toBe("PUBLISHED");
    expect(devotionStatus("2026-01-01", today)).toBe("PUBLISHED");
  });

  it("filters readers to today and earlier, so tomorrow's stays hidden", () => {
    const filter = publishedBy(today);
    const cutoff = filter.publishOn.lte;
    const visible = (day: string) => new Date(`${day}T00:00:00.000Z`) <= cutoff;
    expect(visible("2026-10-22")).toBe(true);
    expect(visible("2026-10-23")).toBe(false);
    expect(filter.publishOn.not).toBeNull();
  });
});

describe("sermon form", () => {
  const base = {
    title: "Ambassadors",
    preacher: "Apostle Edna Makamba",
    preachedAt: "2026-10-18",
    summary: "One paragraph.",
    tags: "Kingdom, kingdom ,  faith",
  };

  it("accepts a named preacher or a guest with a name", () => {
    expect(sermonSchema.safeParse(base).success).toBe(true);
    expect(sermonSchema.safeParse({ ...base, preacher: "GUEST" }).success).toBe(false);
    const guest = sermonSchema.parse({ ...base, preacher: "GUEST", guestName: "Pastor Moyo" });
    expect(preacherName(guest)).toBe("Pastor Moyo");
    expect(sermonSchema.safeParse({ ...base, preacher: "Someone else" }).success).toBe(false);
  });

  it("validates the YouTube link", () => {
    expect(
      sermonSchema.safeParse({ ...base, videoUrl: "https://youtu.be/dQw4w9WgXcQ" }).success,
    ).toBe(true);
    expect(sermonSchema.safeParse({ ...base, videoUrl: "https://vimeo.com/1" }).success).toBe(false);
  });

  it("keeps the summary to two paragraphs and normalises tags", () => {
    expect(sermonSchema.safeParse({ ...base, summary: "a\n\nb\n\nc" }).success).toBe(false);
    expect(sermonSchema.parse(base).tags).toEqual(["kingdom", "faith"]);
    expect(parseTags("  ")).toEqual([]);
    expect(paragraphs("one\n\n\n two \r\n\r\nthree")).toEqual(["one", "two", "three"]);
  });
});
