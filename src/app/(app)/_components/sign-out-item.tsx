"use client";

import { LogOutIcon } from "lucide-react";
import { createPortal, useFormStatus } from "react-dom";

import { RoseCross } from "@/components/loader/rose-cross";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

/**
 * Sign out, with something to look at while it happens.
 *
 * Signing out is not instant — the session row is deleted, then the server
 * redirects — and until this existed the menu simply closed and the app sat
 * there looking untouched. On a slow connection that reads as a click that
 * did not register, and the natural response is to click again.
 *
 * Two decisions hold the rest of this together:
 *
 *   it is still a `<form>` posting to a Server Action, not an `onClick`.
 *   Ending a session is a change, and a GET that does it can be fired by any
 *   image tag on any page the user happens to load;
 *
 *   the menu is held open while the action runs. Radix unmounts a closed
 *   dropdown, which would take the pending state and the overlay down with it
 *   the instant they became relevant.
 */
export function SignOutItem({ signOut }: { signOut: () => Promise<void> }) {
  return (
    <DropdownMenuItem
      asChild
      variant="destructive"
      // Keep the item mounted so `useFormStatus` below has something to report
      // to. The overlay covers the open menu anyway.
      onSelect={(event) => event.preventDefault()}
    >
      <form action={signOut}>
        <SignOutButton />
      </form>
    </DropdownMenuItem>
  );
}

function SignOutButton() {
  // Reads the pending state of the enclosing form, which is why this is a
  // separate component — the hook reports on a parent form, never its own.
  const { pending } = useFormStatus();

  return (
    <>
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center gap-2 disabled:opacity-70"
      >
        {pending ? (
          <RoseCross mode="orbit" className="size-4 shrink-0" />
        ) : (
          <LogOutIcon aria-hidden />
        )}
        {pending ? "Signing out…" : "Sign out"}
      </button>

      {pending && <SigningOutOverlay />}
    </>
  );
}

/**
 * The whole-screen answer to the click.
 *
 * Portalled to `document.body` rather than rendered in place, because the
 * dropdown is itself a positioned, clipped layer — an overlay inside it would
 * be trapped in the menu instead of covering the app.
 *
 * Rendered only while pending, so it never exists during the server render and
 * there is no `document` to reach for until the browser has one.
 */
function SigningOutOverlay() {
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="bg-background/85 fixed inset-0 z-100 grid place-items-center backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-5">
        <RoseCross mode="orbit" className="text-brass size-12" />
        <span className="text-muted-foreground text-sm font-medium">
          Signing out
        </span>
      </div>
    </div>,
    document.body,
  );
}
