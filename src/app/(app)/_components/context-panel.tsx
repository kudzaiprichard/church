"use client";

import { PanelLeftCloseIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { KbdHint } from "./kbd-hint";
import type { RailSection } from "./nav";

/**
 * Zone two: the pages inside whichever section the rail has selected.
 *
 * Same wayfinding as the rail — a brass bar on the left edge of the current
 * page — so moving from rail to panel is one continuous idea rather than two
 * different highlight styles. Square corners throughout, and the group label
 * is mono caps trailed by a hairline, which is the figure the public site uses
 * for its section rules.
 */
export function ContextPanel({
  section,
  onOpenPalette,
  onCollapse,
  onNavigate,
  embedded = false,
}: {
  section: RailSection | undefined;
  onOpenPalette: () => void;
  /** Omitted inside the mobile drawer, which has its own way to close. */
  onCollapse?: () => void;
  onNavigate?: () => void;
  embedded?: boolean;
}) {
  const pathname = usePathname();

  if (!section) return null;

  return (
    <aside
      id={embedded ? undefined : "context-panel"}
      aria-label={section.label}
      className={cn(
        "flex h-full w-full shrink-0 flex-col",
        !embedded && "border-border/60 border-r",
      )}
    >
      <header className="space-y-2 px-3 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="inline-flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="flex size-2.5 shrink-0 items-center justify-center rounded-full border border-[var(--rail-accent)]/60"
            >
              <span className="size-1 rounded-full bg-[var(--rail-accent)]" />
            </span>
            <span className="text-foreground truncate font-mono text-xs tracking-[0.18em] uppercase">
              {section.label}
            </span>
          </h2>

          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse panel"
              aria-controls="context-panel"
              className={cn(
                "text-muted-foreground hover:bg-secondary hover:text-foreground",
                "focus-visible:ring-ring grid size-6 cursor-pointer place-items-center rounded-none",
                "transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none",
              )}
            >
              <PanelLeftCloseIcon className="size-3.5" strokeWidth={1.75} aria-hidden />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Open the command palette"
          className={cn(
            "border-border/60 bg-secondary/50 flex w-full cursor-pointer items-center gap-2 rounded-none border px-2 py-1.5 text-left",
            "hover:bg-secondary hover:border-border focus-visible:ring-ring transition-colors",
            "focus-visible:ring-2 focus-visible:outline-none",
          )}
        >
          <SearchIcon className="text-muted-foreground size-3.5" aria-hidden />
          <span className="text-muted-foreground flex-1 text-xs">Search…</span>
          <KbdHint keys={["⌘", "K"]} />
        </button>
      </header>

      <ScrollArea className="flex-1">
        <ul className="space-y-0.5 px-2 pb-3">
          {section.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            if (item.soon) {
              return (
                <li key={item.href}>
                  <span
                    aria-disabled
                    title="Not built yet"
                    className="text-muted-foreground/45 flex cursor-default items-center gap-2 rounded-none px-2 py-1.5 text-xs leading-tight"
                  >
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="font-mono text-[0.6rem] tracking-[0.12em] uppercase">
                      Soon
                    </span>
                  </span>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2 rounded-none px-2 py-1.5",
                    "focus-visible:ring-ring text-xs leading-tight transition-colors duration-150",
                    "focus-visible:ring-2 focus-visible:outline-none",
                    "before:absolute before:top-1/2 before:left-0 before:h-4 before:w-[2px] before:-translate-y-1/2 before:transition-opacity before:duration-200",
                    active
                      ? "bg-primary/10 text-primary before:bg-[var(--rail-accent)] font-medium before:opacity-100"
                      : "text-foreground/80 hover:bg-secondary hover:text-foreground before:opacity-0",
                  )}
                >
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </ScrollArea>

      {!embedded && (
        <footer className="border-border/60 space-y-1.5 border-t px-3 py-2.5">
          <p className="text-muted-foreground/70 font-mono text-xs tracking-[0.18em] uppercase">
            Shortcuts
          </p>
          <ShortcutRow label="Jump anywhere" keys={["⌘", "K"]} />
          <ShortcutRow label="Toggle panel" keys={["⌘", "/"]} />
        </footer>
      )}
    </aside>
  );
}

function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <KbdHint keys={keys} always />
    </div>
  );
}
