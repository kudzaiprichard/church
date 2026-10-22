import { describe, expect, it } from "vitest";

import {
  isKeyIn,
  isYouTubeUrl,
  keyFromUrl,
  newKey,
  publicUrl,
  uploadProblem,
} from "./storage-rules";

const MB = 1024 * 1024;

describe("uploadProblem", () => {
  it("takes mp3 and m4a audio up to 100 MB", () => {
    expect(uploadProblem("sermons/audio", "audio/mpeg", 40 * MB)).toBeNull();
    expect(uploadProblem("sermons/audio", "audio/mp4", 40 * MB)).toBeNull();
    expect(uploadProblem("sermons/audio", "audio/mpeg", 101 * MB)).toMatch(/over 100 MB/);
    expect(uploadProblem("sermons/audio", "video/mp4", 1 * MB)).toMatch(/mp3 or m4a/);
  });

  it("takes PDFs up to 10 MB and photos up to 2 MB", () => {
    expect(uploadProblem("sermons/notes", "application/pdf", 9 * MB)).toBeNull();
    expect(uploadProblem("sermons/notes", "application/pdf", 11 * MB)).not.toBeNull();
    expect(uploadProblem("avatars", "image/webp", MB)).toBeNull();
    expect(uploadProblem("avatars", "image/gif", MB)).not.toBeNull();
    expect(uploadProblem("avatars", "image/png", 3 * MB)).not.toBeNull();
  });

  it("refuses an empty file", () => {
    expect(uploadProblem("avatars", "image/png", 0)).toBe("That file is empty.");
  });
});

describe("keys", () => {
  const random = "AbCdEfGhIjKlMnOpQrSt";

  it("puts each key in its folder with the type's extension", () => {
    expect(newKey("sermons/audio", "audio/mpeg", random)).toBe(`sermons/audio/${random}.mp3`);
    expect(newKey("avatars", "image/webp", random)).toBe(`avatars/${random}.webp`);
  });

  it("accepts only keys the app could have written into that folder", () => {
    const key = newKey("sermons/audio", "audio/mpeg", random);
    expect(isKeyIn("sermons/audio", key)).toBe(true);
    expect(isKeyIn("sermons/notes", key)).toBe(false);
    expect(isKeyIn("sermons/audio", "sermons/audio/../avatars/x.mp3")).toBe(false);
    expect(isKeyIn("sermons/audio", "avatars/AbCdEfGhIjKlMnOpQrSt.mp3")).toBe(false);
    expect(isKeyIn("sermons/audio", 42)).toBe(false);
  });

  it("maps a key to its public URL and back, and nothing else", () => {
    const base = "https://media.kmmi.church/";
    const url = publicUrl(base, "avatars/abc.webp");
    expect(url).toBe("https://media.kmmi.church/avatars/abc.webp");
    expect(keyFromUrl(base, url)).toBe("avatars/abc.webp");
    expect(keyFromUrl(base, "https://elsewhere.example/avatars/abc.webp")).toBeNull();
    expect(keyFromUrl(base, null)).toBeNull();
  });
});

describe("isYouTubeUrl", () => {
  it("accepts watch, short links, shorts and live", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
    ]) {
      expect(isYouTubeUrl(url)).toBe(true);
    }
  });

  it("rejects other sites, look-alikes and non-video pages", () => {
    for (const url of [
      "https://vimeo.com/123456",
      "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
      "https://notyoutube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/",
      "https://www.youtube.com/watch",
      "javascript:alert(1)",
      "youtube.com/watch?v=dQw4w9WgXcQ",
      "",
    ]) {
      expect(isYouTubeUrl(url)).toBe(false);
    }
  });
});
