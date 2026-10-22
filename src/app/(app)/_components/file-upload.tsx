"use client";

import { UploadIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";

import { FOLDERS, type Folder } from "@/lib/storage-rules";
import { cn } from "@/lib/utils";

import { requestUpload } from "./upload-action";

/**
 * A file picker that uploads straight to storage and leaves the stored key in
 * a hidden field for the surrounding form to post.
 *
 * The file never passes through the app's server: `requestUpload` signs a URL
 * for exactly this file's type, the browser PUTs it there with progress, and
 * the form's own action checks what arrived before saving anything. With
 * storage switched off it says so instead of offering a picker.
 *
 * `prepare` lets a caller transform the file first — the avatar form shrinks
 * photos to 512 px before they leave the device.
 */
export function FileUpload({
  folder,
  name,
  label,
  enabled,
  current,
  hint,
  error,
  prepare,
}: {
  folder: Folder;
  /** The hidden field carrying the new key. */
  name: string;
  label: string;
  enabled: boolean;
  /** What is stored now, shown with the option to remove it. */
  current?: { label: string; href: string } | null;
  hint?: string;
  error?: string;
  prepare?: (file: File) => Promise<Blob>;
}) {
  const [state, setState] = useState<
    | { stage: "idle" }
    | { stage: "uploading"; progress: number; file: string }
    | { stage: "done"; key: string; file: string }
    | { stage: "failed"; message: string }
  >({ stage: "idle" });
  const [removed, setRemoved] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const rules = FOLDERS[folder];
  const accept = Object.keys(rules.types).join(",");

  async function upload(file: File) {
    const body = prepare ? await prepare(file) : file;
    const contentType = body.type || file.type;
    setState({ stage: "uploading", progress: 0, file: file.name });

    const ticket = await requestUpload(folder, contentType, body.size);
    if ("error" in ticket) {
      setState({ stage: "failed", message: ticket.error });
      return;
    }

    // XMLHttpRequest rather than fetch, for upload progress on a 100 MB file.
    const ok = await new Promise<boolean>((resolve) => {
      const request = new XMLHttpRequest();
      request.open("PUT", ticket.uploadUrl);
      request.setRequestHeader("content-type", contentType);
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setState({ stage: "uploading", progress: event.loaded / event.total, file: file.name });
        }
      };
      request.onload = () => resolve(request.status >= 200 && request.status < 300);
      request.onerror = () => resolve(false);
      request.send(body);
    });

    setState(
      ok
        ? { stage: "done", key: ticket.key, file: file.name }
        : { stage: "failed", message: "The upload did not go through. Try again." },
    );
  }

  const id = `upload-${name}`;
  return (
    <div>
      <p className="text-foreground text-sm font-medium" id={`${id}-label`}>
        {label}
      </p>

      {state.stage === "done" && <input type="hidden" name={name} value={state.key} />}
      {removed && state.stage !== "done" && (
        <input type="hidden" name={`${name}Remove`} value="1" />
      )}

      {!enabled ? (
        <p className="text-muted-foreground bg-muted/50 mt-1.5 rounded-lg px-3 py-2.5 text-xs">
          Uploads are switched off until storage is set up.
        </p>
      ) : (
        <div className="mt-1.5 grid gap-2">
          {current && !removed && state.stage !== "done" && (
            <p className="flex items-center gap-2 text-xs">
              <a
                href={current.href}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {current.label}
              </a>
              <button
                type="button"
                onClick={() => setRemoved(true)}
                className="text-destructive inline-flex cursor-pointer items-center gap-0.5 hover:underline"
              >
                <XIcon className="size-3" aria-hidden />
                Remove
              </button>
            </p>
          )}
          <label
            htmlFor={id}
            className={cn(
              "border-input hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm transition-colors",
              "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]",
              error && "border-destructive",
            )}
          >
            <UploadIcon className="text-muted-foreground size-4" aria-hidden />
            <span className="text-muted-foreground min-w-0 flex-1 truncate">
              {state.stage === "idle" || state.stage === "failed"
                ? `Choose a ${[...new Set(Object.values(rules.types))].join(" or ")} file`
                : state.file}
            </span>
            <input
              ref={input}
              id={id}
              type="file"
              accept={accept}
              aria-labelledby={`${id}-label`}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
          </label>
          {state.stage === "uploading" && (
            <div
              role="progressbar"
              aria-label="Upload progress"
              aria-valuenow={Math.round(state.progress * 100)}
              className="bg-muted h-1.5 overflow-hidden rounded-full"
            >
              <div className="bg-primary h-full" style={{ width: `${state.progress * 100}%` }} />
            </div>
          )}
          {state.stage === "done" && (
            <p className="text-success text-xs">Uploaded — save the form to keep it.</p>
          )}
          {state.stage === "failed" && <p className="text-destructive text-xs">{state.message}</p>}
          {error && <p className="text-destructive text-xs">{error}</p>}
          {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
      )}
    </div>
  );
}
