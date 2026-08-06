import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

type SectionProps = {
  id: string;
  /** Order-of-service numeral, carried on the spine. */
  numeral: string;
  label: string;
  heading: string;
  intro?: string;
  children: ReactNode;
  /**
   * How the heading relates to the content.
   * - `stacked` — heading above, content below. The plain case.
   * - `aside` — heading holds a sticky left column, content runs beside it.
   * - `minimal` — label and heading on one line, content takes the room.
   * - `centred` — heading over the middle, for content that is itself symmetric.
   */
  variant?: "stacked" | "aside" | "minimal" | "centred";
  /** Display size of the heading. Sections should not all shout equally. */
  size?: "sm" | "md" | "lg";
  /** Extra matter under the heading in the `aside` column. */
  asideExtra?: ReactNode;
  className?: string;
};

const headingSize = {
  sm: "text-2xl sm:text-[1.75rem]",
  md: "text-3xl sm:text-4xl",
  lg: "text-4xl sm:text-5xl",
} as const;

/**
 * Every section hangs off one continuous spine — a hairline running the height
 * of the page with the section numeral on it. The spine is what holds the page
 * together; the variants are what keep the sections from reading as one shape
 * repeated eight times.
 */
export function Section({
  id,
  numeral,
  label,
  heading,
  intro,
  children,
  variant = "stacked",
  size = "md",
  asideExtra,
  className,
}: SectionProps) {
  const eyebrow = (
    <p className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">{label}</p>
  );

  const title = (
    <h2 className={cn("leading-tight text-balance", headingSize[size])}>{heading}</h2>
  );

  return (
    <section id={id} className={cn("relative scroll-mt-24", className)}>
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] md:grid-cols-[7rem_minmax(0,1fr)]">
          <div className="border-border relative border-r">
            <span className="numeric text-accent-foreground bg-background absolute top-24 -right-[0.6rem] py-2 text-[0.7rem] tracking-[0.15em]">
              {numeral}
            </span>
          </div>

          <div className="min-w-0 pt-24 pb-24 pl-6 sm:pt-28 sm:pb-28 md:pl-12">
            {variant === "minimal" ? (
              <>
                <Reveal>
                  <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
                    {eyebrow}
                    <span aria-hidden className="border-border hidden h-px flex-1 border-t sm:block" />
                  </div>
                  <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    {title}
                    {intro ? (
                      <p className="text-muted-foreground max-w-sm text-sm text-pretty">{intro}</p>
                    ) : null}
                  </div>
                </Reveal>
                <div className="mt-12">{children}</div>
              </>
            ) : variant === "aside" ? (
              <div className="grid gap-12 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-16">
                <Reveal>
                  <div className="lg:sticky lg:top-28">
                    {eyebrow}
                    <div className="mt-5">{title}</div>
                    {intro ? (
                      <p className="text-muted-foreground mt-4 text-sm leading-relaxed text-pretty">
                        {intro}
                      </p>
                    ) : null}
                    {asideExtra ? <div className="mt-6">{asideExtra}</div> : null}
                  </div>
                </Reveal>
                <div>{children}</div>
              </div>
            ) : variant === "centred" ? (
              <>
                <Reveal>
                  <div className="mx-auto max-w-xl text-center">
                    {eyebrow}
                    <div className="mt-5">{title}</div>
                    {intro ? (
                      <p className="text-muted-foreground mt-5 text-pretty">{intro}</p>
                    ) : null}
                  </div>
                </Reveal>
                <div className="mt-14">{children}</div>
              </>
            ) : (
              <>
                <Reveal>{eyebrow}</Reveal>
                <Reveal delay={70}>
                  <div className="mt-5 max-w-2xl">{title}</div>
                </Reveal>
                {intro ? (
                  <Reveal delay={130}>
                    <p className="text-muted-foreground mt-5 max-w-xl text-pretty">{intro}</p>
                  </Reveal>
                ) : null}
                <div className="mt-14">{children}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
