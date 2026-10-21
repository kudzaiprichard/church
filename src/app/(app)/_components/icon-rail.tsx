"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { RailSection } from "./nav";
import { NavIcon } from "./nav-icon";

/**
 * Zone one: the sections of the system, as icons, on the crest's royal blue —
 * the same band as the public nav, so signing in never feels like leaving the
 * church for a different product.
 *
 * The current section is an inverted chip: white, with the icon in royal blue.
 * One flat shape carries the state on its own, so there is no edge bar or
 * glow to keep in step with it.
 *
 * Every icon carries a tooltip, because an icon on its own is a guess.
 */
const ROYAL = "text-[oklch(0.450_0.220_265.6)]";

export function IconRail({
  sections,
  activeId,
  panelCollapsed,
  onTogglePanel,
}: {
  sections: RailSection[];
  activeId: string | undefined;
  panelCollapsed: boolean;
  onTogglePanel: () => void;
}) {
  return (
    <nav
      aria-label="Sections"
      className="bg-rail text-rail-foreground flex h-full w-16 shrink-0 flex-col items-center gap-1 py-3"
    >
      <Link
        href="/dashboard"
        aria-label="KMMI — church system"
        className="grid size-10 place-items-center rounded-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
      >
        <Logo size={34} />
      </Link>
      <span aria-hidden className="my-2 h-px w-6 bg-white/15" />

      <TooltipProvider delayDuration={120}>
        <ul className="flex flex-col items-center gap-1.5">
          {sections.map((section) => (
            <li key={section.id}>
              <RailButton section={section} active={section.id === activeId} />
            </li>
          ))}
        </ul>

        <div className="flex-1" />

        {/* Only meaningful where the panel exists — below lg the shell hides it,
            so this has nothing to toggle. */}
        <div className="hidden lg:block">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onTogglePanel}
                aria-label={panelCollapsed ? "Expand panel" : "Collapse panel"}
                aria-pressed={panelCollapsed}
                aria-controls="context-panel"
                className={cn(
                  "grid size-10 cursor-pointer place-items-center rounded-lg text-white/60",
                  "transition-colors duration-150 hover:bg-white/10 hover:text-white",
                  "focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none",
                )}
              >
                {panelCollapsed ? (
                  <PanelLeftOpenIcon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                ) : (
                  <PanelLeftCloseIcon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="text-xs">
              {panelCollapsed ? "Expand panel" : "Collapse panel"} · ⌘/
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </nav>
  );
}

function RailButton({ section, active }: { section: RailSection; active: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={section.href}
          aria-label={section.label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "grid size-10 place-items-center rounded-lg transition-colors duration-150",
            "focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none",
            active ? cn("bg-white", ROYAL) : "text-white/65 hover:bg-white/10 hover:text-white",
          )}
        >
          <NavIcon name={section.icon} className="size-[18px]" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="text-xs">
        {section.label}
      </TooltipContent>
    </Tooltip>
  );
}
