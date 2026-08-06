"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { church } from "@/lib/church";
import { cn } from "@/lib/utils";

const order = [
  { numeral: "I", label: "Welcome", href: "#welcome" },
  { numeral: "II", label: "Visit", href: "#visit" },
  { numeral: "III", label: "Ministries", href: "#ministries" },
  { numeral: "IV", label: "Sermons", href: "#sermons" },
  { numeral: "V", label: "What's on", href: "#events" },
];

export function SiteNav() {
  const [condensed, setCondensed] = useState(false);
  const [current, setCurrent] = useState("welcome");

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
          ? "bg-background/85 border-border border-b py-3 backdrop-blur-sm"
          : "border-b border-transparent py-6",
      )}
    >
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6">
        <Link href="#welcome" className="flex shrink-0 items-center gap-3">
          <RoseMark className="text-accent-foreground size-7" />
          <span className="font-heading hidden text-sm leading-none sm:inline">
            {church.shortName}
            <span className="text-muted-foreground block font-mono text-[0.6rem] tracking-[0.18em] uppercase">
              Chapel · {church.address.city}
            </span>
          </span>
        </Link>

        <ol className="mx-auto hidden items-center gap-7 md:flex">
          {order.map((entry) => {
            const active = current === entry.href.slice(1);
            return (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "group flex items-baseline gap-2 text-sm transition-colors",
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

        <div className="ml-auto md:ml-0">
          <ThemeToggle />
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
