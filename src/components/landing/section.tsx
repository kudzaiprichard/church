import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

const tones = {
  plain: "bg-background",
  tint: "bg-muted",
  parchment: "bg-parchment",
};

/**
 * One band of the landing page.
 *
 * Sections alternate between plain and tinted grounds so the seams read
 * without a single rule being drawn, and the few that need more presence get
 * the hairline grid fading in from the top. The container is narrower than a
 * full desktop row on purpose — compact lines are what make the page read as
 * designed rather than stretched.
 */
export function Section({
  id,
  tone = "plain",
  grid = false,
  className,
  children,
}: {
  id?: string;
  tone?: keyof typeof tones;
  grid?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn("relative scroll-mt-16 overflow-hidden py-20 md:py-28", tones[tone], className)}
    >
      {grid && <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

/** A small label: a gold dot and a few tracked capitals. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-accent-foreground inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase",
        className,
      )}
    >
      <span aria-hidden className="bg-brass size-1.5 rounded-full" />
      {children}
    </p>
  );
}

/**
 * Eyebrow, title, and a line of context. Left-aligned by default with the
 * description (or an action) set to the right on wide screens — the centred
 * stack is kept for the one or two sections that are about a single idea.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  const centred = align === "center";

  return (
    <div
      className={cn(
        "mb-12 md:mb-14",
        centred
          ? "mx-auto max-w-2xl text-center"
          : "grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:items-end md:gap-12",
        className,
      )}
    >
      <div>
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
        <Reveal from="mask" delay={60} className="mt-4">
          <h2 className="text-navy text-3xl leading-[1.1] font-bold text-balance md:text-[2.5rem]">
            {title}
          </h2>
        </Reveal>
        {centred && description && (
          <Reveal delay={120}>
            <p className="text-muted-foreground mt-4 leading-relaxed text-pretty">{description}</p>
          </Reveal>
        )}
      </div>

      {!centred && (description || action) && (
        <Reveal delay={120}>
          {description && (
            <p className="text-muted-foreground leading-relaxed text-pretty">{description}</p>
          )}
          {action && <div className={cn(description && "mt-4")}>{action}</div>}
        </Reveal>
      )}
    </div>
  );
}
