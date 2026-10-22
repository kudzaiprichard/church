"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings", label: "Church information" },
  { href: "/settings/theme", label: "Theme of the Year" },
  { href: "/settings/social", label: "Social media" },
];

/** The three settings pages, as tabs that are real links. */
export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings"
      className="border-border mb-5 flex gap-1 scrollbar-none overflow-x-auto border-b"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
              active
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
