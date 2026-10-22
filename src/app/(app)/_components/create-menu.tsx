"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import type { CreateAction } from "./nav";
import { NavIcon } from "./nav-icon";

/**
 * "New", from any page: the things this person can start, and nothing they
 * cannot. One menu instead of a create button hunted for on each page.
 */
export function CreateMenu({ actions }: { actions: CreateAction[] }) {
  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "action-solid inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-semibold",
          "focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        )}
      >
        <PlusIcon className="size-4" aria-hidden />
        <span className="hidden sm:inline">New</span>
        <span className="sr-only sm:hidden">New</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
          Start something new
        </DropdownMenuLabel>
        {actions.map((action) => (
          <DropdownMenuItem key={action.href} asChild>
            <Link href={action.href} className="cursor-pointer">
              <NavIcon name={action.icon} className="text-muted-foreground size-4" />
              {action.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
