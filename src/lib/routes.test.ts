import { describe, expect, it } from "vitest";

import { PROTECTED_PREFIXES, isProtectedPath, protectedSegmentPattern } from "./routes";

describe("isProtectedPath", () => {
  it("covers each prefix and everything beneath it", () => {
    for (const prefix of PROTECTED_PREFIXES) {
      expect(isProtectedPath(prefix)).toBe(true);
      expect(isProtectedPath(`${prefix}/anything/deeper`)).toBe(true);
    }
  });

  it("leaves the public site public", () => {
    for (const path of ["/", "/about", "/login", "/privacy", "/no-such-page"]) {
      expect(isProtectedPath(path)).toBe(false);
    }
  });

  it("does not match a public path that merely starts with a prefix's letters", () => {
    expect(isProtectedPath("/membership-info")).toBe(false);
    expect(isProtectedPath("/settingsx")).toBe(false);
  });
});

describe("protectedSegmentPattern", () => {
  it("names every prefix exactly once, without its leading slash", () => {
    const pattern = protectedSegmentPattern();
    expect(pattern.startsWith("/(")).toBe(true);
    const names = pattern.slice(2, -1).split("|");
    expect(names).toEqual(PROTECTED_PREFIXES.map((prefix) => prefix.slice(1)));
  });
});
