"use client";

import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";
import { useInView, usePrefersReducedMotion } from "./use-scroll";

/**
 * A hairline that draws itself in from the left as it arrives, rather than
 * being there all along. Used between rows of information, where a static
 * border would land as a hard edge the moment the row faded up.
 */
export function DrawnRule({ className, delay = 0 }: { className?: string; delay?: number }) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0 });
  const reduced = usePrefersReducedMotion();
  const settled = inView || reduced;

  return (
    <div ref={ref} aria-hidden className={cn("h-px w-full overflow-hidden", className)}>
      <div
        style={reduced ? undefined : { transitionDelay: `${delay}ms` }}
        className={cn(
          "rule-draw bg-foreground/15 h-px w-full",
          settled ? "scale-x-100" : "reveal-pending scale-x-0",
        )}
      />
    </div>
  );
}

/**
 * The mark each section opens with: a numeral, a short rule, a label.
 *
 * Deliberately *not* a full-width band — a hairline stretched across the
 * viewport reads as a lid clamped on the section. This sits in whatever
 * column its section uses and takes only the width of its own words, so the
 * section keeps its air.
 *
 * The numeral is optional: a second lane inside one section takes the mark
 * without a number, so the page's count still matches its sections.
 */
export function SectionRule({
  numeral,
  label,
  align = "left",
  tone = "ink",
  className,
}: {
  numeral?: string;
  label: string;
  align?: "left" | "right" | "centre";
  tone?: "ink" | "light";
  className?: string;
}) {
  return (
    <Reveal>
      <div
        className={cn(
          // Fixed height, so a rule without a numeral still occupies as much
          // as one with — two lanes of the same section have to start their
          // headings on the same line.
          "flex min-h-[1.875rem] items-center gap-5",
          align === "right" && "flex-row-reverse",
          align === "centre" && "justify-center",
          className,
        )}
      >
        {numeral && (
          <span
            className={cn(
              "font-heading text-3xl leading-none",
              tone === "ink" ? "text-accent-foreground" : "text-white/70",
            )}
          >
            {numeral}
          </span>
        )}
        <span
          aria-hidden
          className={cn("h-px w-10", tone === "ink" ? "bg-foreground/30" : "bg-white/30")}
        />
        <span
          className={cn(
            "font-mono text-[0.7rem] tracking-[0.22em] uppercase",
            tone === "ink" ? "text-muted-foreground" : "text-white/55",
          )}
        >
          {label}
        </span>
      </div>
    </Reveal>
  );
}
