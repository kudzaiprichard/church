import type { ReactNode } from "react";

import { RoseCross } from "@/components/loader/rose-cross";
import { cn } from "@/lib/utils";

/**
 * The one layout every dead end in the app uses.
 *
 * A 404 and a 500 are the two screens most likely to be built twice and to
 * drift, so they share a component. It is presentational only — no data, no
 * status codes of its own — because the route files above it are what Next
 * uses to decide the actual HTTP status, and duplicating that decision here
 * would be a way for the page to disagree with the response.
 *
 * The code is set as a numeral in the same treatment the landing page gives
 * its section numbers, so an error still looks like part of this site rather
 * than a browser default.
 */
export function StatusPage({
  code,
  title,
  description,
  children,
  tone = "quiet",
  className,
}: {
  /** Shown large. A status number, or a short word where there is no number. */
  code: string;
  title: string;
  description: ReactNode;
  /** Whatever the reader should do next. */
  children?: ReactNode;
  /**
   * `quiet` for the expected dead ends — a mistyped URL is not an emergency.
   * `alarm` warms the mark for a genuine fault, which is the one case where
   * the page should feel different from an ordinary empty state.
   */
  tone?: "quiet" | "alarm";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[70svh] flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <RoseCross
        mode="orbit"
        className={cn("size-14", tone === "alarm" ? "text-brass" : "text-muted-foreground/40")}
      />

      <p className="numeric text-muted-foreground mt-9 text-[0.7rem] tracking-[0.3em]">{code}</p>

      <h1 className="text-navy mt-4 max-w-xl text-3xl leading-tight font-bold text-balance sm:text-4xl">
        {title}
      </h1>

      <div className="text-muted-foreground mt-4 max-w-md text-sm leading-relaxed text-pretty">
        {description}
      </div>

      {children && <div className="mt-9 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </div>
  );
}
