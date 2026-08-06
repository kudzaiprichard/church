"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { useInView, usePrefersReducedMotion } from "./use-scroll";

type RevealProps = {
  children: ReactNode;
  /** Stagger within a group, in milliseconds. */
  delay?: number;
  /**
   * How the element arrives.
   *
   *   mask   the line rises out of a clipped band — for headings, where the
   *          letterforms should look like they were always there and the page
   *          simply moved to show them
   *   below  a short lift with a fade — for paragraphs and rows
   *   left   \ panels of a two-lane section parting from their own side
   *   right  /
   */
  from?: "mask" | "below" | "left" | "right";
  /**
   * Play on load rather than on scroll, as a pure CSS animation.
   *
   * For anything above the fold: there is nothing to scroll into view, and
   * waiting for an IntersectionObserver means waiting for hydration — which
   * leaves the opening screen blank for as long as that takes. These start
   * when the stylesheet parses and need no JavaScript at all.
   */
  onLoad?: boolean;
  className?: string;
};

const offsets = {
  below: "translate-y-5",
  left: "-translate-x-8",
  right: "translate-x-8",
} as const;

export function Reveal({ children, delay = 0, from = "below", onLoad, className }: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();

  const settled = inView || reduced;
  const stagger = reduced ? undefined : { transitionDelay: `${delay}ms` };

  // The mask is two elements by necessity: the outer one clips, the inner one
  // moves. Nothing but transform animates, so it stays off the main thread.
  if (from === "mask") {
    return (
      <div ref={onLoad ? undefined : ref} className={cn("reveal-mask", className)}>
        <div
          style={onLoad ? { animationDelay: `${delay}ms` } : stagger}
          className={
            onLoad
              ? "animate-mask-rise"
              : cn(
                  "ease-rise transition-transform duration-[900ms] motion-reduce:transition-none",
                  settled ? "translate-y-0" : "reveal-pending translate-y-full",
                )
          }
        >
          {children}
        </div>
      </div>
    );
  }

  if (onLoad) {
    return (
      <div style={{ animationDelay: `${delay}ms` }} className={cn("animate-rise", className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={stagger}
      className={cn(
        "ease-rise transition-[opacity,transform] duration-700 motion-reduce:transition-none",
        settled
          ? "translate-x-0 translate-y-0 opacity-100"
          : cn("reveal-pending opacity-0", offsets[from]),
        className,
      )}
    >
      {children}
    </div>
  );
}
