"use client";

import { useActionState } from "react";

import { Submit } from "@/app/(auth)/_components/form-parts";

import { FileUpload } from "../_components/file-upload";
import { FormSuccess } from "../_components/form-fields";

import { removeAvatar, setAvatar } from "./actions";
import { profileIdleState } from "./form-state";

/**
 * Shrink a photo to fit 512 × 512 and re-encode it as WebP on the device, so
 * a phone's 8 MB camera image uploads as a few dozen kilobytes (SCOPE §9.20).
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not read that photo."))),
      "image/webp",
      0.85,
    ),
  );
}

export function AvatarForm({
  avatarUrl,
  initials,
  uploads,
}: {
  avatarUrl: string | null;
  initials: string;
  uploads: boolean;
}) {
  const [state, action] = useActionState(setAvatar, profileIdleState);

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          // A plain img: the photo is already 512 px, served from the storage
          // bucket the Content Security Policy allows.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden
            className="bg-secondary text-primary grid size-16 place-items-center rounded-full text-lg font-bold"
          >
            {initials}
          </span>
        )}
        {avatarUrl && (
          <form action={removeAvatar}>
            <button
              type="submit"
              className="text-destructive cursor-pointer text-xs font-semibold hover:underline"
            >
              Remove photo
            </button>
          </form>
        )}
      </div>
      <form key={state.attempt ?? "empty"} action={action} className="grid gap-3">
        <FormSuccess>{state.done ? "Photo saved." : undefined}</FormSuccess>
        <FileUpload
          folder="avatars"
          name="avatarKey"
          label="New photo"
          enabled={uploads}
          prepare={shrink}
          error={state.fieldErrors?.avatarKey}
          hint="JPEG, PNG or WebP. It is shrunk to 512 px before it leaves your device."
        />
        {uploads && (
          <div className="sm:max-w-[12rem]">
            <Submit pendingLabel="Saving…">Save photo</Submit>
          </div>
        )}
      </form>
    </div>
  );
}
