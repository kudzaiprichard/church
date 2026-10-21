"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * The home page's sections, addressed from the root so the same bar works on
 * the About page too — there they navigate home, on the home page they scroll.
 */
const links = [
  { label: "About", href: "/about" },
  { label: "Theme", href: "/#theme" },
  { label: "Portal", href: "/#portal" },
  { label: "Groups", href: "/#groups" },
  { label: "Visit", href: "/#visit" },
];

/** The element id a link scrolls to, or null for a link to another page. */
const sectionOf = (href: string) => (href.startsWith("/#") ? href.slice(2) : null);

/** The office's details, from Settings — read by the page, as the bar is a Client Component. */
export type NavContact = { phone: string | null; address: string | null; mapUrl: string | null };

/**
 * What the bar is allowed to know about whoever is reading it.
 *
 * Deliberately two fields. The nav needs to greet someone and to name where
 * their link goes, and nothing else about a user should be in a Client
 * Component on a public page — see the read in `app/page.tsx`.
 */
export type NavSession = { firstName: string } | null;

/**
 * The KMMI bar. Solid royal blue over the hero; once the page moves under it,
 * it turns to frosted glass so the section beneath still shows through.
 *
 * Two things follow the reader down the page: the link for the section in view
 * is marked, and a gold hairline along the bottom fills as they read. The
 * hairline is driven by the scroll position in CSS (`.scroll-progress`), so it
 * costs no JavaScript at all.
 */
export function SiteNav({ session, contact }: { session: NavSession; contact: NavContact }) {
  const [scrolled, setScrolled] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Marks the section in the middle band of the viewport as current.
  useEffect(() => {
    const sections = links
      .map((link) => sectionOf(link.href))
      .map((id) => (id ? document.getElementById(id) : null))
      .filter((element): element is HTMLElement => element !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300",
        scrolled
          ? "bg-ink/85 border-b border-white/10 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <Logo size={34} />
          <span className="leading-none">
            <span className="font-display block text-[0.8rem] font-bold tracking-[0.06em] text-white">
              Kingdom Manifest
            </span>
            <span className="text-brass mt-1 block text-[0.65rem] font-medium tracking-[0.14em] uppercase">
              Ministries International
            </span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = current !== null && current === sectionOf(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "relative rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none",
                    active ? "text-white" : "text-white/70 hover:text-white",
                  )}
                >
                  {link.label}
                  <span
                    aria-hidden
                    className={cn(
                      "bg-brass absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-transform duration-300 motion-reduce:transition-none",
                      active ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <PortalLink session={session} className="hidden sm:inline-flex" />

          <ThemeToggle tone="onBlue" className="hidden sm:inline-flex" />

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="inline-flex size-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none md:hidden"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" aria-hidden focusable="false" className="size-5">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </SheetTrigger>

            <SheetContent side="right" className="bg-ink gap-0 border-white/10 px-6 py-8 text-white">
              <div className="flex items-center gap-3">
                <Logo size={38} />
                <div>
                  <SheetTitle className="font-display text-sm font-bold text-white">
                    Kingdom Manifest
                  </SheetTitle>
                  <SheetDescription className="text-brass text-[0.65rem] tracking-[0.14em] uppercase">
                    Ministries International
                  </SheetDescription>
                </div>
              </div>

              <ul className="mt-8 grid gap-1">
                {links.map((link) => (
                  <li key={link.href}>
                    <SheetClose asChild>
                      <Link
                        href={link.href}
                        className="block rounded-lg px-3 py-2.5 text-[0.95rem] font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  </li>
                ))}
              </ul>

              <SheetClose asChild>
                <PortalLink session={session} className="mt-6 w-full" />
              </SheetClose>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm text-white/70">Theme</span>
                <ThemeToggle tone="onBlue" />
              </div>

              <div className="mt-auto grid gap-1.5 pt-8 text-sm text-white/60">
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone.replace(/\s/g, "")}`}
                    className="rounded-sm hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                  >
                    {contact.phone}
                  </a>
                )}
                {contact.address && contact.mapUrl && (
                  <a
                    href={contact.mapUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-sm hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                  >
                    {contact.address}
                  </a>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Reading progress. */}
      <div aria-hidden className="scroll-progress bg-brass absolute inset-x-0 bottom-0 h-0.5" />
    </header>
  );
}

/**
 * The one place on the public site that knows whether you are signed in.
 * Signed out it is the gold "Sign in"; signed in it becomes the way back to
 * your own area, marked with your initial so the change is visible at a glance.
 */
function PortalLink({ session, className }: { session: NavSession; className?: string }) {
  return (
    <Link
      href={session ? "/dashboard" : "/login"}
      className={cn(
        "action-gold inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors",
        "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)] focus-visible:outline-none",
        className,
      )}
    >
      {session ? (
        <>
          <span
            aria-hidden
            className="bg-ink grid size-5 place-items-center rounded-full text-[0.65rem] text-white"
          >
            {session.firstName.charAt(0).toUpperCase()}
          </span>
          Dashboard
        </>
      ) : (
        "Sign in"
      )}
    </Link>
  );
}
