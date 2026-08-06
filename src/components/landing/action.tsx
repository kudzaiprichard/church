"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The landing page's call to action.
 *
 * Separate from `ui/button` on purpose: that component is sized for an admin
 * interface (32px tall, tight padding) and is shared with the rest of the
 * system, so it should not grow a one-off marketing variant.
 *
 * These are flat. No shelf, no shadow, no lift — nothing that suggests the
 * button is a physical object sitting on top of the page. What is left has to
 * carry the states on its own, so hover and press are a single deliberate step
 * down into the fill each, and the arrow leans forward to say the thing is
 * live. A quiet action draws its brass underline in from the left.
 */
const actionVariants = cva(
  cn(
    "group/action relative inline-flex shrink-0 items-center justify-center gap-2.5",
    "text-sm font-medium tracking-wide whitespace-nowrap",
    "transition-colors duration-200 ease-out",
    // Focus rings use --ring, not brass: brass sits at roughly 2.9:1 on sand,
    // which is under the 3:1 a focus indicator has to clear. Brass stays
    // decorative — it draws underlines, it never carries state.
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
    "disabled:pointer-events-none disabled:opacity-55 motion-reduce:transition-none",
  ),
  {
    variants: {
      tone: {
        solid: "action-solid rounded-md px-6 py-3.5",
        quiet: cn("text-foreground rounded-md px-1 py-3.5", "focus-visible:ring-offset-4"),
        /* For the dark bands, where the page's ink colours have nothing to sit on. */
        light: cn(
          "rounded-md px-6 py-3.5 text-white",
          "border border-white/25 hover:border-white/55 hover:bg-white/10 active:bg-white/[0.16]",
          "focus-visible:ring-offset-[var(--ink)]",
        ),
      },
    },
    defaultVariants: { tone: "solid" },
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
