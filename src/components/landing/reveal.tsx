"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { useInView, usePrefersReducedMotion } from "./use-scroll";

type RevealProps = {
  children: ReactNode;
  /** Stagger within a group, in milliseconds. */
  delay?: number;
  /** Where the element travels from. Sections rise; diptych panels part sideways. */
  from?: "below" | "left" | "right";
  className?: string;
};

const offsets = {
  below: "translate-y-6",
  left: "-translate-x-6",
  right: "translate-x-6",
} as const;

export function Reveal({ children, delay = 0, from = "below", className }: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();

  const settled = inView || reduced;

  return (
    <div
      ref={ref}
      style={reduced ? undefined : { transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        settled ? "translate-x-0 translate-y-0 opacity-100" : cn("opacity-0", offsets[from]),
        className,
      )}
    >
      {children}
    </div>
  );
}
