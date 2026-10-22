import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { bulletin } from "@/lib/church";
import { getChurchInfo, getVisibleSocialLinks } from "@/lib/settings";

import { BulletinForm } from "./bulletin-form";
import { SocialIcons } from "./social-icons";

const columnsFor = (email: string | null) => [
  {
    heading: "Church",
    links: [
      { label: "About us", href: "/about" },
      { label: "Theme of the year", href: "/#theme" },
      { label: "Connect groups", href: "/#groups" },
      { label: "Sermons", href: "/#sermons" },
      { label: "Visit us", href: "/#visit" },
    ],
  },
  {
    heading: "Portal",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Forgot password", href: "/forgot-password" },
      ...(email ? [{ label: "Contact the office", href: `mailto:${email}` }] : []),
    ],
  },
];

const linkClass =
  "rounded-sm text-sm text-white/75 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)] focus-visible:outline-none";

/**
 * The KMMI footer: the crest and name, two columns of links, and the bulletin.
 *
 * Reads its own church details and social links from Settings (cached), so
 * every page that ends with it shows the same, current contacts without each
 * one having to pass them down.
 */
export async function Closing() {
  const [church, socials] = await Promise.all([getChurchInfo(), getVisibleSocialLinks()]);
  const columns = columnsFor(church.email);

  return (
    <footer className="bg-hero relative overflow-hidden text-white">
      <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr_1fr_1.4fr] md:gap-8">
          <div>
            <div className="flex items-center gap-3">
              <Logo size={42} className="shrink-0" />
              <div className="leading-none">
                <p className="font-display text-sm font-bold tracking-[0.06em]">Kingdom Manifest</p>
                <p className="text-brass mt-1.5 text-[0.65rem] font-medium tracking-[0.14em] uppercase">
                  Ministries International
                </p>
              </div>
            </div>
            {church.tagline && (
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/75">
                {church.tagline}
              </p>
            )}
            <SocialIcons links={socials} className="mt-6" />
          </div>

          {columns.map((column) => (
            <div key={column.heading}>
              <h2 className="text-brass text-xs font-semibold tracking-[0.16em] uppercase">
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="text-brass text-xs font-semibold tracking-[0.16em] uppercase">
              {bulletin.heading}
            </h2>
            <p className="mt-4 mb-4 text-sm leading-relaxed text-white/75">{bulletin.blurb}</p>
            <BulletinForm />
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/75 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {church.name}
          </p>
          {(church.address || church.phone) && (
            <address className="not-italic">
              {church.address}
              {church.address && church.phone && " · "}
              {church.phone && (
                <a href={`tel:${church.phone.replace(/\s/g, "")}`} className="hover:text-white/80">
                  {church.phone}
                </a>
              )}
            </address>
          )}
          <nav aria-label="Legal" className="flex gap-5">
            <Link
              href="/privacy"
              className="rounded-sm hover:text-white/80 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="rounded-sm hover:text-white/80 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
