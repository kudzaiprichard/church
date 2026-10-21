"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The public site's call to action.
 *
 * Separate from `ui/button` on purpose: that component is sized for an admin
 * interface (32px tall, tight padding) and is shared with the rest of the
 * system, so it should not grow a one-off marketing variant.
 *
 * Flat, all of them — no shadow, no lift. The fill carries every state on its
 * own, and the arrow leaning forward is the only movement.
 *
 *   gold     the primary action — crown gold, navy lettering
 *   solid    royal blue, for a second action on paper
 *   outline  a hairline in blue that fills on hover
 *   light    frosted glass, for the blue bands
 *   quiet    a text link whose gold underline draws in from the left
 */
const actionVariants = cva(
  cn(
    "group/action relative inline-flex h-11 shrink-0 items-center justify-center gap-2",
    "text-sm font-semibold whitespace-nowrap",
    "transition-colors duration-200 ease-out",
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
    "disabled:pointer-events-none disabled:opacity-55 motion-reduce:transition-none",
  ),
  {
    variants: {
      tone: {
        gold: "action-gold rounded-lg px-5",
        solid: "action-solid rounded-lg px-5",
        outline: cn(
          "border-primary/30 text-primary rounded-lg border px-5",
          "hover:border-primary hover:bg-secondary",
        ),
        quiet: cn("text-foreground h-auto rounded-md px-1 py-2", "focus-visible:ring-offset-4"),
        light: cn(
          "rounded-lg border border-white/20 bg-white/10 px-5 text-white backdrop-blur-sm",
          "hover:border-white/35 hover:bg-white/15",
          "focus-visible:ring-white focus-visible:ring-offset-[var(--ink)]",
        ),
      },
    },
    defaultVariants: { tone: "gold" },
  },
);

type ActionProps = VariantProps<typeof actionVariants> & {
  children: ReactNode;
  className?: string;
  /** An arrow that leans forward on hover. Off by default — not every action is a journey. */
  arrow?: boolean;
};

function Body({ children, tone, arrow }: Pick<ActionProps, "children" | "tone" | "arrow">) {
  return (
    <>
      <span className="relative">
        {children}
        {tone === "quiet" && (
          /* The underline is its own element rather than a text-decoration so
             it can be scaled from the left edge on the compositor. */
          <span
            aria-hidden
            className="ease-rise absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-[var(--brass)] transition-transform duration-300 group-hover/action:scale-x-100 group-focus-visible/action:scale-x-100 motion-reduce:transition-none"
          />
        )}
      </span>
      {arrow && (
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          focusable="false"
          className="ease-rise size-3.5 translate-x-0 transition-transform duration-200 group-hover/action:translate-x-1 motion-reduce:transition-none"
        >
          <path
            d="M2 8h11M9 4l4 4-4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </>
  );
}

export function ActionLink({
  children,
  className,
  tone,
  arrow,
  ...props
}: ActionProps & ComponentProps<"a">) {
  return (
    <a className={cn(actionVariants({ tone }), className)} {...props}>
      <Body tone={tone} arrow={arrow}>
        {children}
      </Body>
    </a>
  );
}

export function ActionButton({
  children,
  className,
  tone,
  arrow,
  ...props
}: ActionProps & ComponentProps<"button">) {
  return (
    <button className={cn(actionVariants({ tone }), className)} {...props}>
      <Body tone={tone} arrow={arrow}>
        {children}
      </Body>
    </button>
  );
}
