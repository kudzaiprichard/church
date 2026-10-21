import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The shell every sign-in screen sits in: one card centred on the canvas, the
 * hairline grid from the public site fading out behind it, and no navigation.
 * Somebody on these screens has exactly one thing to do, and offering them the
 * rest of the site is only a way to lose them. The theme switch is the one
 * exception, in the corner, because a bright white form at night is its own
 * reason to give up.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="bg-canvas relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm">
        <Link
          href="/"
          className="focus-visible:ring-ring mx-auto mb-6 flex w-fit items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:outline-none"
        >
          <Logo size={40} className="shrink-0" />
          <span className="leading-none">
            <span className="font-display text-navy block text-sm font-bold tracking-[0.06em]">
              Kingdom Manifest
            </span>
            <span className="text-accent-foreground mt-1.5 block text-[0.65rem] font-medium tracking-[0.14em] uppercase">
              Member Portal
            </span>
          </span>
        </Link>

        <div className="bg-card border-border rounded-2xl border p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
