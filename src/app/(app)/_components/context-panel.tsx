"use client";

import { PanelLeftCloseIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { KbdHint } from "./kbd-hint";
import type { RailSection } from "./nav";
import { NavIcon } from "./nav-icon";

/**
 * Zone two: the pages inside whichever section the rail has selected.
 *
 * Each page has its icon beside it, and the current one is a soft blue pill —
 * the same flat treatment as the public site's chips. Modules that are not
 * built yet stay listed, greyed, with a "Soon" tag, so the panel shows where
 * the system is going without offering a link that leads nowhere.
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
      className={cn("bg-card flex h-full w-full shrink-0 flex-col", !embedded && "border-border border-r")}
    >
      <header className="space-y-3 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-accent-foreground text-[0.65rem] font-semibold tracking-[0.16em] uppercase">
              KMMI portal
            </p>
            <h2 className="text-foreground mt-0.5 truncate text-base font-bold">{section.label}</h2>
          </div>

          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse panel"
              aria-controls="context-panel"
              className={cn(
                "text-muted-foreground hover:bg-muted hover:text-foreground",
                "focus-visible:ring-ring grid size-8 cursor-pointer place-items-center rounded-lg",
                "transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none",
              )}
            >
              <PanelLeftCloseIcon className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Open the command palette"
          className={cn(
            "border-border bg-muted flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-left",
            "hover:border-input focus-visible:ring-ring transition-colors",
            "focus-visible:ring-2 focus-visible:outline-none",
          )}
        >
          <SearchIcon className="text-muted-foreground size-3.5" aria-hidden />
          <span className="text-muted-foreground flex-1 text-sm">Search…</span>
          <KbdHint keys={["⌘", "K"]} />
        </button>
      </header>

      <ScrollArea className="flex-1">
        <ul className="space-y-0.5 px-3 pb-4">
          {section.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            if (item.soon) {
              return (
                <li key={item.href}>
                  <span
                    aria-disabled
                    title="Not built yet"
                    className="text-muted-foreground/60 flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm"
                  >
                    <NavIcon name={item.icon} className="size-4 shrink-0 opacity-60" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide uppercase">
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
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                    active
                      ? "bg-secondary text-primary font-semibold"
                      : "text-foreground/75 hover:bg-muted hover:text-foreground",
                  )}
                >
                  <NavIcon name={item.icon} className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </ScrollArea>

      {!embedded && (
        <footer className="border-border space-y-2 border-t px-4 py-3">
          <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-[0.16em] uppercase">
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
