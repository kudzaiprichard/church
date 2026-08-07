import { RoseCross } from "./rose-cross";

/**
 * The in-app loader, shown while a route's data is on its way.
 *
 * Quieter than the boot overlay by design. That one covers a cold start, where
 * a beat of ceremony is welcome; this one appears every time somebody opens a
 * page, so it stays still and lets a single glint do the talking. The same
 * mark in both places is what keeps them feeling like one system.
 *
 * `role="status"` with a live region means a screen reader announces the wait
 * instead of landing on a silently empty page. One label serves both — the
 * uppercase is a CSS transform, so assistive technology reads the real word
 * rather than an initialism, and there is no need for a second hidden copy.
 */
export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="grid min-h-[60svh] place-items-center">
      <div className="flex flex-col items-center gap-5">
        <RoseCross mode="orbit" className="text-brass size-12" />
        <span className="text-muted-foreground font-mono text-[0.6rem] tracking-[0.18em] uppercase">
          {label}
        </span>
      </div>
    </div>
  );
}
