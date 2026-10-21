"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { KbdHint } from "./kbd-hint";
import type { RailSection } from "./nav";
import { NavIcon } from "./nav-icon";

/**
 * Jump anywhere, from the keyboard.
 *
 * Lists every page the signed-in person can reach, filtered as they type.
 * Modules that are not built yet appear greyed and cannot be chosen — the
 * palette tells the same truth the panel does about what exists.
 *
 * It only ever offers what the rail contains, and that has already been
 * filtered by role, so a member cannot find the member directory in here. Even
 * if they could, the page itself would still turn them away.
 */
export function CommandPalette({
  rail,
  open,
  onOpenChange,
}: {
  rail: RailSection[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();

  const items = useMemo(
    () =>
      rail.flatMap((section) =>
        section.items.map((item) => ({ ...item, section: section.label })),
      ),
    [rail],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(needle) ||
        item.section.toLowerCase().includes(needle),
    );
  }, [items, query]);

  /**
   * Reset on open, done in the handler rather than an effect watching `open`:
   * the state is being cleared *because* of an interaction, so the interaction
   * is where it belongs.
   */
  const setOpen = (next: boolean) => {
    if (next) {
      setQuery("");
      setActive(0);
    }
    onOpenChange(next);
  };

  const choose = (index: number) => {
    const item = results[index];
    if (!item || item.soon) return;
    setOpen(false);
    router.push(item.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(active);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-xl p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Search the system</DialogTitle>

        <div className="border-border flex items-center gap-3 border-b px-4">
          <SearchIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Go to…"
            aria-label="Search the system"
            className="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
          />
          <KbdHint keys={["Esc"]} />
        </div>

        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="text-muted-foreground px-3 py-8 text-center text-sm">
              Nothing matches “{query}”.
            </li>
          )}

          {results.map((item, index) => (
            <li key={item.href}>
              <button
                type="button"
                disabled={item.soon}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm",
                  "cursor-pointer transition-colors duration-150 disabled:cursor-default",
                  item.soon
                    ? "text-muted-foreground/45"
                    : index === active
                      ? "bg-secondary text-primary font-medium"
                      : "text-foreground hover:bg-muted",
                )}
              >
                <NavIcon name={item.icon} className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                <span className="text-muted-foreground ml-auto text-xs">
                  {item.soon ? "Soon" : item.section}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
