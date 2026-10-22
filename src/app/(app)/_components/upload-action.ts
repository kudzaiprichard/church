"use server";

import { requirePermission, requireSession } from "@/lib/auth/dal";
import { signUpload, type UploadTicket } from "@/lib/storage";
import { isFolder } from "@/lib/storage-rules";

/**
 * Sign one direct upload to storage (docs/SCOPE.md §9.20).
 *
 * Avatars are anyone's to upload; sermon audio and handouts are the Apostles'
 * (`sermons.manage`). The ticket is only permission to put one file of one
 * type in one place for ten minutes — nothing points at it until a form that
 * checks it again is saved.
 */
export async function requestUpload(
  folder: string,
  contentType: string,
  size: number,
): Promise<UploadTicket | { error: string }> {
  if (!isFolder(folder)) return { error: "That kind of upload is not allowed." };
  if (folder === "avatars") await requireSession();
  else await requirePermission("sermons.manage");

  return signUpload(folder, contentType, size);
}
