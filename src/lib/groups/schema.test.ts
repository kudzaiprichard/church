import { describe, expect, it } from "vitest";

import { groupSchema, idListSchema, slugify } from "./schema";

describe("slugify", () => {
  it("matches the seeded slugs", () => {
    expect(slugify("Youth Alive")).toBe("youth-alive");
    expect(slugify("Kingdom Total Women")).toBe("kingdom-total-women");
    expect(slugify("Praise and Worship")).toBe("praise-and-worship");
  });

  it("folds accents, spells out ampersands and collapses punctuation", () => {
    expect(slugify("  Café — Mothers' Union!  ")).toBe("cafe-mothers-union");
    expect(slugify("Praise & Worship")).toBe("praise-and-worship");
  });
});

describe("groupSchema", () => {
  it("requires a name with letters or digits in it", () => {
    expect(groupSchema.safeParse({ name: "" }).success).toBe(false);
    expect(groupSchema.safeParse({ name: "!!!" }).success).toBe(false);
    expect(groupSchema.safeParse({ name: "Hosting" }).success).toBe(true);
  });

  it("treats blank optional fields as absent", () => {
    expect(groupSchema.parse({ name: "Hosting", audience: " ", description: "" })).toEqual({
      name: "Hosting",
    });
  });
});

describe("idListSchema", () => {
  it("drops duplicates", () => {
    expect(idListSchema.parse(["a", "b", "a"])).toEqual(["a", "b"]);
  });
});
