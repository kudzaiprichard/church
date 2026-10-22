import "server-only";

import { randomBytes } from "node:crypto";

import { AwsClient } from "aws4fetch";

import { env, storageIsConfigured } from "@/lib/env";

import { newKey, publicUrl, uploadProblem, type Folder } from "./storage-rules";

/**
 * File storage on Cloudflare R2 (docs/SCOPE.md §9.20).
 *
 * R2 speaks the S3 API, so requests are signed with `aws4fetch` and sent with
 * plain `fetch` — no SDK. Large audio cannot pass through a Server Action
 * (request bodies are capped well below 100 MB), so uploads go straight from
 * the browser to R2 with a URL this module signs for one object, one content
 * type and ten minutes. The form then posts only the key, and `inspect` asks
 * R2 what actually arrived before anything is saved.
 *
 * Without the `R2_*` variables every function here refuses politely and the
 * pages hide their upload controls.
 */

let client: AwsClient | null = null;

function r2() {
  if (!storageIsConfigured) throw new Error("Storage is not configured.");
  client ??= new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
  });
  return client;
}

/** The S3 endpoint for one object in the bucket. */
function objectUrl(key: string) {
  return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export { storageIsConfigured };

export type UploadTicket = { uploadUrl: string; key: string; url: string; contentType: string };

/**
 * Sign a direct upload, after checking type and size against the folder's
 * rules. The signature covers the content type, so the browser cannot send
 * something else under it.
 */
export async function signUpload(
  folder: Folder,
  contentType: string,
  size: number,
): Promise<UploadTicket | { error: string }> {
  if (!storageIsConfigured) return { error: "Uploads are not set up yet." };
  const problem = uploadProblem(folder, contentType, size);
  if (problem) return { error: problem };

  const key = newKey(folder, contentType, randomBytes(18).toString("base64url"));
  const target = new URL(objectUrl(key));
  target.searchParams.set("X-Amz-Expires", "600");

  const signed = await r2().sign(target.toString(), {
    method: "PUT",
    headers: { "content-type": contentType },
    aws: { signQuery: true },
  });

  return { uploadUrl: signed.url, key, url: publicUrl(env.R2_PUBLIC_URL!, key), contentType };
}

/**
 * What R2 holds under a key — its type and size — or `null` when nothing is
 * there. Used to check an upload before a record points at it.
 */
export async function inspect(key: string): Promise<{ contentType: string; size: number } | null> {
  if (!storageIsConfigured) return null;
  const response = await r2().fetch(objectUrl(key), { method: "HEAD" });
  if (!response.ok) return null;
  return {
    contentType: response.headers.get("content-type") ?? "",
    size: Number(response.headers.get("content-length") ?? 0),
  };
}

/**
 * A stored object that fits its folder's rules, as the URL to save — or why
 * not. The second check after `signUpload`: what arrived, not what was asked.
 */
export async function acceptUpload(folder: Folder, key: string) {
  const found = await inspect(key);
  if (!found) return { error: "The upload did not finish. Choose the file again." } as const;
  const problem = uploadProblem(folder, found.contentType, found.size);
  if (problem) {
    await remove(key);
    return { error: problem } as const;
  }
  return { url: publicUrl(env.R2_PUBLIC_URL!, key), key } as const;
}

/**
 * Delete an object. Best effort: a record is never kept alive because its file
 * could not be removed, and a missing object is already the state wanted.
 */
export async function remove(key: string | null | undefined): Promise<void> {
  if (!key || !storageIsConfigured) return;
  try {
    const response = await r2().fetch(objectUrl(key), { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
      console.error("[storage] Could not delete", key, response.status);
    }
  } catch (error) {
    console.error("[storage] Could not delete", key, error);
  }
}
