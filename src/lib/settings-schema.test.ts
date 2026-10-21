import { describe, expect, it } from "vitest";

import { churchInfoSchema, isPlatformUrl, socialLinkSchema, themeSchema } from "./settings-schema";

describe("isPlatformUrl", () => {
  it.each([
    ["FACEBOOK", "https://www.facebook.com/KMMIOfficial"],
    ["FACEBOOK", "https://m.facebook.com/KMMIOfficial"],
    ["INSTAGRAM", "https://instagram.com/kmmi_official"],
    ["YOUTUBE", "https://www.youtube.com/@KMMIChurch"],
    ["YOUTUBE", "https://youtu.be/abc123"],
    ["WHATSAPP", "https://wa.me/263771000001"],
  ] as const)("accepts %s %s", (platform, url) => {
    expect(isPlatformUrl(platform, url)).toBe(true);
  });

  it.each([
    ["FACEBOOK", "http://www.facebook.com/KMMIOfficial", "plain http"],
    ["FACEBOOK", "https://www.instagram.com/kmmi", "another platform"],
    ["INSTAGRAM", "https://instagram.com.evil.example/kmmi", "a look-alike host"],
    ["INSTAGRAM", "https://notinstagram.com/kmmi", "a suffix that is not a subdomain"],
    ["WHATSAPP", "https://whatsapp.com/263771000001", "WhatsApp's site rather than wa.me"],
    ["YOUTUBE", "javascript:alert(1)", "a script URL"],
    ["YOUTUBE", "https://user:pass@youtube.com/x", "embedded credentials"],
    ["FACEBOOK", "facebook.com/KMMIOfficial", "no scheme"],
  ] as const)("refuses %s %s (%s)", (...[platform, url]) => {
    expect(isPlatformUrl(platform, url)).toBe(false);
  });
});

describe("socialLinkSchema", () => {
  it("lets a hidden platform stay empty", () => {
    expect(socialLinkSchema("FACEBOOK").safeParse({ isVisible: false }).success).toBe(true);
  });

  it("requires a link and a handle for a visible platform", () => {
    expect(socialLinkSchema("FACEBOOK").safeParse({ isVisible: true }).success).toBe(false);
    expect(
      socialLinkSchema("FACEBOOK").safeParse({
        isVisible: true,
        handle: "@KMMIOfficial",
        url: "https://www.facebook.com/KMMIOfficial",
      }).success,
    ).toBe(true);
  });

  it("refuses an off-platform link even when hidden", () => {
    expect(
      socialLinkSchema("WHATSAPP").safeParse({ isVisible: false, url: "https://example.org" })
        .success,
    ).toBe(false);
  });
});

describe("themeSchema", () => {
  it("coerces the year from the form and requires the verse", () => {
    const result = themeSchema.safeParse({
      year: "2027",
      title: "A new theme",
      scriptureRef: "Psalm 23:1",
      verseText: "The Lord is my shepherd.",
    });
    expect(result.success && result.data.year).toBe(2027);
    expect(themeSchema.safeParse({ year: "2027", title: "x", scriptureRef: "y" }).success).toBe(
      false,
    );
  });

  it("rejects a year that is not a plain year", () => {
    for (const year of ["", "twenty", "1999", "2026.5"]) {
      expect(
        themeSchema.safeParse({ year, title: "t", scriptureRef: "r", verseText: "v" }).success,
      ).toBe(false);
    }
  });
});

describe("churchInfoSchema", () => {
  it("requires a name and short name and clears blank optional fields", () => {
    const result = churchInfoSchema.parse({ name: " KMMI Church ", shortName: "KMMI", email: "" });
    expect(result.name).toBe("KMMI Church");
    expect(result.email).toBeUndefined();
    expect(churchInfoSchema.safeParse({ name: "", shortName: "" }).success).toBe(false);
  });
});
