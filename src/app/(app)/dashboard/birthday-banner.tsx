"use client";

import { CakeIcon, XIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

/**
 * The gold banner on a member's birthday (docs/SCOPE.md §9.2). Dismissing it
 * is remembered in this browser for the year, so it does not come back on
 * every page load — and comes back next year.
 */
export function BirthdayBanner({ firstName, year }: { firstName: string; year: number }) {
  const key = `birthday-banner-dismissed-${year}`;
  const dismissed = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => true,
  );
  if (dismissed) return null;

  return (
    <div className="bg-brass/20 border-brass/50 mb-4 flex items-start gap-3 rounded-lg border px-4 py-3">
      <CakeIcon className="text-accent-foreground mt-0.5 size-5 shrink-0" aria-hidden />
      <p className="text-foreground flex-1 text-sm">
        <span className="font-semibold">Happy birthday, {firstName}!</span> The whole church
        celebrates you today.
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          try {
            localStorage.setItem(key, "1");
          } catch {
            // Private browsing: it simply comes back next time.
          }
          window.dispatchEvent(new Event("birthday-banner"));
        }}
        className="text-muted-foreground hover:text-foreground cursor-pointer rounded-md p-1"
      >
        <XIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function read(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("birthday-banner", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("birthday-banner", callback);
    window.removeEventListener("storage", callback);
  };
}
