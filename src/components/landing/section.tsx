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
  className?: string;
  /** Content escapes the text column and runs wider. */
  wide?: boolean;
};

/**
 * Every section hangs off one continuous spine — a hairline running the full
 * height of the page with the section numeral sitting on it. It is what keeps
 * the sections reading as a single order of service rather than a stack of
 * unrelated slabs, and it puts every heading on the same hard left edge.
 */
export function Section({
  id,
  numeral,
  label,
  heading,
  intro,
  children,
  className,
  wide = false,
}: SectionProps) {
  return (
    <section id={id} className={cn("relative scroll-mt-24", className)}>
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] md:grid-cols-[7rem_minmax(0,1fr)]">
          {/* The spine. */}
          <div className="border-border relative border-r">
            <span className="numeric text-accent-foreground bg-background absolute top-24 -right-[0.6rem] py-2 text-[0.7rem] tracking-[0.15em]">
              {numeral}
            </span>
          </div>

          <div className="min-w-0 pt-24 pb-24 pl-6 sm:pt-28 sm:pb-28 md:pl-12">
            <Reveal>
              <p className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
                {label}
              </p>
            </Reveal>

            <Reveal delay={70}>
              <h2 className="mt-5 max-w-2xl text-3xl leading-tight text-balance sm:text-4xl">
                {heading}
              </h2>
            </Reveal>

            {intro ? (
              <Reveal delay={130}>
                <p className="text-muted-foreground mt-5 max-w-xl text-pretty">{intro}</p>
              </Reveal>
            ) : null}

            <div className={cn("mt-14", wide && "md:-mr-[8vw] xl:-mr-[12vw]")}>{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
