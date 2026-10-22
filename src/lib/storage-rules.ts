/**
 * What may be stored, and where (docs/SCOPE.md §9.20). Pure — no network, no
 * credentials — so the limits are unit tested and the browser can show them.
 *
 * Every upload names a folder; the folder fixes the allowed types and the
 * size limit, and every key the app writes starts with its folder. A key is
 * therefore its own proof of what it is for: the sermon form accepts an
 * audio key only if it begins `sermons/audio/`.
 */

export const FOLDERS = {
  "sermons/audio": {
    label: "audio",
    maxBytes: 100 * 1024 * 1024,
    types: { "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a" },
  },
  "sermons/notes": {
    label: "PDF",
    maxBytes: 10 * 1024 * 1024,
    types: { "application/pdf": "pdf" },
  },
  avatars: {
    label: "photo",
    maxBytes: 2 * 1024 * 1024,
    types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" },
  },
} as const;

export type Folder = keyof typeof FOLDERS;

export function isFolder(value: unknown): value is Folder {
  return typeof value === "string" && value in FOLDERS;
}

const megabytes = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;

/** Why an upload may not go ahead, or `null` when it may. */
export function uploadProblem(folder: Folder, contentType: string, size: number): string | null {
  const rules = FOLDERS[folder];
  if (!(contentType in rules.types)) {
    const allowed = [...new Set(Object.values(rules.types))].join(" or ");
    return `Choose a ${allowed} file.`;
  }
  if (!Number.isFinite(size) || size <= 0) return "That file is empty.";
  if (size > rules.maxBytes) return `That ${rules.label} is over ${megabytes(rules.maxBytes)}.`;
  return null;
}

/** A fresh, unguessable key in the folder, with the type's extension. */
export function newKey(folder: Folder, contentType: string, random: string): string {
  const extension = (FOLDERS[folder].types as Record<string, string>)[contentType] ?? "bin";
  return `${folder}/${random}.${extension}`;
}

/** True for a key the app could have written into this folder — nothing else is accepted. */
export function isKeyIn(folder: Folder, key: unknown): key is string {
  return typeof key === "string" && new RegExp(`^${folder}/[A-Za-z0-9_-]{16,64}\\.[a-z0-9]{2,4}$`).test(key);
}

/** The public URL for a key, under the bucket's public address. */
export function publicUrl(base: string, key: string): string {
  return `${base.replace(/\/+$/, "")}/${key}`;
}

/** The key back from a URL the app built — or `null` for any other URL. */
export function keyFromUrl(base: string, url: string | null | undefined): string | null {
  if (!url) return null;
  const prefix = `${base.replace(/\/+$/, "")}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

/** True for a link to a YouTube video page: youtube.com/watch, youtu.be, shorts or live. */
export function isYouTubeUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.replace(/^(www|m)\./, "");
  if (host === "youtu.be") return /^\/[\w-]{6,}$/.test(url.pathname);
  if (host !== "youtube.com") return false;
  if (url.pathname === "/watch") return /^[\w-]{6,}$/.test(url.searchParams.get("v") ?? "");
  return /^\/(shorts|live)\/[\w-]{6,}$/.test(url.pathname);
}
