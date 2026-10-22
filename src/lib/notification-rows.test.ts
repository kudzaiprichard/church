import { describe, expect, it } from "vitest";

import { internalPath, notificationRows } from "./notification-rows";

describe("internalPath", () => {
  it("keeps a plain path on this site", () => {
    expect(internalPath("/messages/abc")).toBe("/messages/abc");
    expect(internalPath("/notifications?type=MESSAGE")).toBe("/notifications?type=MESSAGE");
  });

  it("drops anything a browser could follow off the site", () => {
    for (const value of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "/redirect?to=https://evil.example",
      "messages",
      "",
      null,
      undefined,
    ]) {
      expect(internalPath(value)).toBeNull();
    }
  });
});

describe("notificationRows", () => {
  it("writes one row per distinct recipient", () => {
    const rows = notificationRows({ userIds: ["a", "b", "a"], type: "MESSAGE", title: "Hi" });
    expect(rows.map((row) => row.userId)).toEqual(["a", "b"]);
  });

  it("keys each recipient's row separately so a rerun skips only those already told", () => {
    const rows = notificationRows({
      userIds: ["a", "b"],
      type: "EVENT_REMINDER",
      title: "Tomorrow",
      dedupeKey: "event-reminder:e1",
    });
    expect(rows.map((row) => row.dedupeKey)).toEqual(["event-reminder:e1:a", "event-reminder:e1:b"]);
    expect(notificationRows({ userIds: ["a"], type: "MESSAGE", title: "x" })[0].dedupeKey).toBe(
      null,
    );
  });

  it("drops an external link and an empty body, and clips long text", () => {
    const [row] = notificationRows({
      userIds: ["a"],
      type: "MESSAGE",
      title: "t".repeat(400),
      body: "   ",
      linkUrl: "https://evil.example",
    });
    expect(row.linkUrl).toBeNull();
    expect(row.body).toBeNull();
    expect(row.title).toHaveLength(160);
  });
});
