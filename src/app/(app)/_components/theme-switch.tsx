"use client";

import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

/** Nothing to subscribe to — the answer only ever goes from false to true. */
const noSubscription = () => () => {};

const OPTIONS = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: LaptopIcon },
] as const;

const BUTTON =
  "grid h-7 w-7 cursor-pointer place-items-center rounded-none transition-colors duration-150";

/**
 * The theme control, which opens sideways rather than downwards.
 *
 * A dropdown for three mutually exclusive icons is more machinery than the
 * choice deserves: a menu that has to be positioned, portalled and dismissed,
 * to show three things that would fit on the bar itself. So this widens to the
 * left instead — the trigger stays exactly where it was, the other two options
 * appear beside it, and picking one closes it again.
 *
 * Anchored right and grown leftwards, so nothing to the right of it ever moves.
 *
 * Rendering is deferred until mount: `next-themes` cannot know the resolved
 * theme on the server, and drawing the wrong icon first would be a visible flip
 * on every page load.
 */
export function ThemeSwitch() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // `useSyncExternalStore` rather than an effect that sets a flag: it is the
  // API built for "the server and the client disagree, and the client is
  // right", and it does not cost a second render pass to say so.
  const mounted = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

  // Close on a click elsewhere or on Escape — the two things every dismissable
  // surface is expected to answer to.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2];
  // The trigger shows what you are actually looking at, so "system" reads as
  // the sun or the moon rather than as a laptop nobody can interpret.
  const TriggerIcon = mounted
    ? theme === "system"
      ? resolvedTheme === "dark"
        ? MoonIcon
        : SunIcon
      : current.Icon
    : SunIcon;

  return (
    // Reserves the collapsed width and animates to the open width. Because the
    // inner row is pinned to the right, the growth happens on the left.
    <div
      ref={box}
      className={cn(
        "relative h-7 transition-[width] duration-200 ease-out motion-reduce:transition-none",
        open ? "w-[5.5rem]" : "w-7",
      )}
    >
      <div className="border-border/70 absolute top-0 right-0 flex h-7 items-center border">
        {open ? (
          OPTIONS.map((option) => {
            const active = mounted && theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                aria-label={`${option.label} theme`}
                aria-pressed={active}
                title={option.label}
                className={cn(
                  BUTTON,
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <option.Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
              </button>
            );
          })
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-label="Change theme"
            title="Change theme"
            className={cn(
              BUTTON,
              "text-muted-foreground hover:bg-secondary hover:text-foreground",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            )}
          >
            <TriggerIcon className="size-3.5" strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
