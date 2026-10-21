"use client";

import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore, type MouseEvent } from "react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: LaptopIcon },
] as const;

type ThemeValue = (typeof OPTIONS)[number]["value"];

/** Nothing to subscribe to — the answer only ever goes from false to true. */
const noSubscription = () => () => {};

/**
 * Puts the theme on the document straight away, the same way `next-themes`
 * will a moment later. The view transition below snapshots the page as soon as
 * its callback returns, so the change has to be on the DOM by then — waiting
 * for React to re-render and for the provider's effect to run would capture
 * the old theme twice and reveal nothing.
 */
function applyNow(next: ThemeValue) {
  const dark =
    next === "dark" ||
    (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

/**
 * The one theme control, used on the public site, the sign-in screens and in
 * the app's top bar.
 *
 * Three options, all visible, one click each: a segmented switch rather than a
 * menu, because a menu hides the current state and costs two clicks for a
 * choice that fits in 90 pixels. "System" is a first-class option, and the
 * active segment always shows what was *chosen* rather than what it resolved
 * to, so picking "Dark" on a dark machine still visibly does something.
 *
 * The change itself grows out from the point that was clicked, in a circle,
 * using a view transition. Browsers without view transitions, and anyone who
 * has asked for reduced motion, get the change instantly.
 *
 * Rendering of the selected state is deferred until mount: `next-themes`
 * cannot know the stored theme on the server, and marking the wrong segment
 * first would be a visible flip on every page load.
 */
export function ThemeToggle({
  tone = "default",
  className,
}: {
  /** `onBlue` for the royal-blue bands of the public site. */
  tone?: "default" | "onBlue";
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const onBlue = tone === "onBlue";

  const choose = (next: ThemeValue, event: MouseEvent<HTMLButtonElement>) => {
    if (next === theme) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduced) {
      setTheme(next);
      return;
    }

    // A keyboard press reports no pointer position (`detail` is 0), so the
    // circle starts from the middle of the button instead.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.detail === 0 ? rect.left + rect.width / 2 : event.clientX;
    const y = event.detail === 0 ? rect.top + rect.height / 2 : event.clientY;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = document.startViewTransition(() => {
      applyNow(next);
      setTheme(next);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
        },
        {
          duration: 520,
          easing: "cubic-bezier(0.16, 0.84, 0.32, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-lg border p-0.5",
        onBlue ? "border-white/15 bg-white/10" : "border-border bg-muted",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={(event) => choose(option.value, event)}
            aria-pressed={active}
            aria-label={`${option.label} theme`}
            title={option.label}
            className={cn(
              "grid size-7 cursor-pointer place-items-center rounded-md transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:outline-none",
              onBlue
                ? cn(
                    "focus-visible:ring-white",
                    active ? "text-ink bg-white" : "text-white/70 hover:bg-white/10 hover:text-white",
                  )
                : cn(
                    "focus-visible:ring-ring",
                    active
                      ? "bg-card text-foreground ring-border ring-1"
                      : "text-muted-foreground hover:text-foreground",
                  ),
            )}
          >
            <option.Icon className="size-3.5" strokeWidth={2} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
