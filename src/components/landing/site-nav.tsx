"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { church } from "@/lib/church";
import { cn } from "@/lib/utils";

import { ActionLink } from "./action";

/**
 * The order of service. Every section on the page is listed here so the current
 * position can be tracked across all of them; `inBar` marks the four that are
 * short enough to sit in the bar without crowding it, and the rest appear in
 * the sheet on small screens.
 */
const order = [
  { numeral: "I", label: "Welcome", href: "#welcome", inBar: false },
  { numeral: "II", label: "Times", href: "#times", inBar: true },
  { numeral: "III", label: "What to expect", href: "#visit", inBar: true },
  { numeral: "IV", label: "Why we gather", href: "#mission", inBar: true },
  { numeral: "V", label: "Teaching", href: "#teaching", inBar: true },
  { numeral: "VI", label: "Plan your visit", href: "#plan", inBar: false },
];

const barEntries = order.filter((entry) => entry.inBar);

export function SiteNav() {
  const [condensed, setCondensed] = useState(false);
  const [current, setCurrent] = useState("welcome");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Marks the current item in the order of service as the reader moves down.
  useEffect(() => {
    const sections = order
      .map((entry) => document.getElementById(entry.href.slice(1)))
      .filter((element): element is HTMLElement => element !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[padding,background-color,border-color] duration-300",
        condensed
          ? "bg-background/85 border-border border-b py-3 backdrop-blur-md"
          : "border-b border-transparent py-6",
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex w-full max-w-7xl items-center gap-6 px-6 sm:px-8 lg:px-12"
      >
        <Link
          href="#welcome"
          className="focus-visible:ring-ring flex shrink-0 items-center gap-3 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <RoseMark className="text-accent-foreground size-7" />
          <span className="font-heading text-sm leading-none">
            {church.shortName}
            <span className="text-muted-foreground mt-1 block font-mono text-[0.6rem] tracking-[0.18em] uppercase">
              Chapel · {church.address.city}
            </span>
          </span>
        </Link>

        <ol className="mx-auto hidden items-center gap-7 lg:flex">
          {barEntries.map((entry) => {
            const active = current === entry.href.slice(1);
            return (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "group focus-visible:ring-ring flex items-baseline gap-2 rounded-sm text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="numeric text-[0.62rem] opacity-70">{entry.numeral}</span>
                  <span
                    className={cn(
                      "decoration-accent-foreground underline-offset-[6px]",
                      active ? "underline" : "group-hover:underline",
                    )}
                  >
                    {entry.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <ActionLink href="#plan" className="hidden px-5 py-2.5 text-[0.8rem] sm:inline-flex">
            Plan your visit
          </ActionLink>

          <ThemeToggle />

          {/* Everything the bar cannot hold, on small screens. */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="focus-visible:ring-ring text-foreground hover:bg-muted -mr-1.5 inline-flex size-9 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none lg:hidden"
              aria-label="Open the order of service"
            >
              <svg viewBox="0 0 20 20" aria-hidden focusable="false" className="size-5">
                <path
                  d="M3 6h14M3 10h14M3 14h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </SheetTrigger>

            <SheetContent side="right" className="gap-0 px-6 py-8">
              <SheetTitle className="font-heading text-lg">{church.name}</SheetTitle>
              <SheetDescription className="text-muted-foreground font-mono text-[0.6rem] tracking-[0.18em] uppercase">
                The order of service
              </SheetDescription>

              <ol className="mt-8 grid">
                {order.map((entry) => (
                  <li key={entry.href} className="border-border border-b">
                    <SheetClose asChild>
                      <Link
                        href={entry.href}
                        className="focus-visible:ring-ring flex items-baseline gap-4 rounded-sm py-3.5 text-base transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <span className="numeric text-accent-foreground w-6 shrink-0 text-[0.7rem]">
                          {entry.numeral}
                        </span>
                        {entry.label}
                      </Link>
                    </SheetClose>
                  </li>
                ))}
              </ol>

              <div className="mt-8 grid gap-2">
                <a
                  href={`tel:${church.phone.replace(/\s/g, "")}`}
                  className="focus-visible:ring-ring text-muted-foreground rounded-sm text-sm focus-visible:ring-2 focus-visible:outline-none"
                >
                  {church.phone}
                </a>
                <a
                  href={church.mapUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="focus-visible:ring-ring text-muted-foreground rounded-sm text-sm focus-visible:ring-2 focus-visible:outline-none"
                >
                  {church.address.line1}, {church.address.city}
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

/** Twelve spokes — the same window, reduced to a mark. */
function RoseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" strokeWidth="1.25" />
      {Array.from({ length: 12 }, (_, index) => (
        <line
          key={index}
          x1="16"
          y1="4"
          x2="16"
          y2="12"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          transform={`rotate(${index * 30} 16 16)`}
        />
      ))}
    </svg>
  );
}
