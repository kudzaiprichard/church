"use client";

import { ChevronDownIcon, LogOutIcon, UserIcon } from "lucide-react";
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

/**
 * Who you are signed in as, and the way out.
 *
 * Sign out is a form posting to a Server Action rather than a link: ending a
 * session is a change, and a GET that does it can be fired by any image tag on
 * any page the user happens to load.
 */
export function UserMenu({ user, signOut }: { user: SessionUser; signOut: () => Promise<void> }) {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus-visible:ring-ring hover:bg-muted flex items-center gap-2.5 rounded-md py-1 pr-2 pl-1 transition-colors focus-visible:ring-2 focus-visible:outline-none">
        <span
          aria-hidden
          className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-medium"
        >
          {initials}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs leading-tight font-medium">
            {user.firstName} {user.lastName}
          </span>
          <span className="text-muted-foreground block font-mono text-[0.55rem] tracking-[0.14em] uppercase">
            {user.role === "ADMIN" ? "Administrator" : "Member"}
          </span>
        </span>
        <ChevronDownIcon className="text-muted-foreground size-3.5" aria-hidden />
        <span className="sr-only">Open the account menu</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
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

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild variant="destructive">
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOutIcon aria-hidden />
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
