"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import Link from "next/link";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { RailSection } from "./nav";
import { NavIcon } from "./nav-icon";

/**
 * Zone one: the sections of the system, as icons.
 *
 * Square buttons rather than rounded pills, and the current section is marked
 * by a brass bar flush to the rail's outer edge — one accent colour doing all
 * the wayfinding, the same figure the public site uses for its section rules.
 * The rail is 48px and the button 34px, so the 7px offset lands the bar exactly
 * on x=0.
 *
 * Every icon carries a tooltip, because an icon on its own is a guess.
 */
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
      className="border-border/60 flex h-full w-12 shrink-0 flex-col items-center gap-1 border-r py-2.5"
    >
      <Link
        href="/dashboard"
        aria-label="Cornerstone — church system"
        className="focus-visible:ring-ring grid h-9 w-9 place-items-center focus-visible:ring-2 focus-visible:outline-none"
      >
        <RoseMark className="text-primary size-6" />
      </Link>
      <span aria-hidden className="bg-border mt-1 mb-2 h-px w-5" />

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
                  "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  "focus-visible:ring-ring grid h-[34px] w-[34px] cursor-pointer place-items-center rounded-none",
                  "transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none",
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
            "group relative grid h-[34px] w-[34px] place-items-center rounded-none",
            "focus-visible:ring-ring transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none",
            "after:pointer-events-none after:absolute after:top-1/2 after:-left-[7px] after:h-5 after:w-[2px] after:-translate-y-1/2 after:transition-opacity after:duration-200",
            active
              ? "bg-primary/10 text-primary after:bg-[var(--rail-accent)] after:opacity-100"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground after:opacity-0",
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

/** Twelve spokes — the same mark the public site uses. */
function RoseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {Array.from({ length: 12 }, (_, spoke) => (
        <line
          key={spoke}
          x1="16"
          y1="4"
          x2="16"
          y2="12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          transform={`rotate(${spoke * 30} 16 16)`}
        />
      ))}
    </svg>
  );
}
