"use client";

import { ChevronDownIcon, KeyRoundIcon, UserIcon } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

import { SignOutItem } from "./sign-out-item";

/**
 * Who you are, at the right-hand end of the top bar.
 *
 * Sign out is a form posting to a Server Action rather than a link, because
 * ending a session is a change — a GET that does it can be fired by any image
 * tag on any page the user happens to load.
 */
export function UserMenu({
  user,
  signOut,
}: {
  user: SessionUser;
  signOut: () => Promise<void>;
}) {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={cn(
          "hover:bg-muted focus-visible:ring-ring flex h-9 cursor-pointer items-center gap-2.5 rounded-lg pr-2 pl-1",
          "transition-colors focus-visible:ring-2 focus-visible:outline-none",
        )}
      >
        <span
          aria-hidden
          className="bg-primary text-primary-foreground grid size-7 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold"
        >
          {initials}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-sm font-semibold">
            {user.firstName} {user.lastName}
          </span>
          <span className="text-muted-foreground block text-xs">
            {user.role === "ADMIN" ? "Administrator" : "Member"}
          </span>
        </span>
        <ChevronDownIcon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-64 rounded-xl">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">
            {user.firstName} {user.lastName}
          </span>
          <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserIcon aria-hidden />
            Your account
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/change-password">
            <KeyRoundIcon aria-hidden />
            Change password
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <SignOutItem signOut={signOut} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
