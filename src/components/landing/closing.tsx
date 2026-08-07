import Link from "next/link";

import { bulletin, church, services, socials } from "@/lib/church";

import { BulletinForm } from "./bulletin-form";

const sundayTimes = services.filter((service) => service.day === "Sunday");
const midweek = services.filter((service) => service.day !== "Sunday");

const explore = [
  { label: "Times & place", href: "#times" },
  { label: "What to expect", href: "#visit" },
  { label: "Why we gather", href: "#mission" },
  { label: "Teaching", href: "#teaching" },
  { label: "Plan your visit", href: "#plan" },
];

/**
 * The footer carries everything a visitor might still be looking for, on the
 * same ink the mission band used — so the page closes on the colour it turned
 * dark for in the middle, rather than introducing a third ground.
 */
export function Closing() {
  return (
    <footer className="relative z-10 text-white" style={{ backgroundColor: "var(--ink)" }}>
      <div aria-hidden className="h-[3px]" style={{ backgroundColor: "var(--brass)" }} />

      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8 lg:py-20">
        {/* Four equal columns rather than a 12-track split: the contact column
            was narrow enough to break the email address mid-word. */}
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {/* Who and where. */}
          <div>
            <div className="flex items-start gap-3.5">
              <RoseMark className="mt-0.5 size-8 shrink-0 text-white/60" />
              <div>
                <p className="font-heading text-lg leading-none">{church.name}</p>
                <p className="mt-2 font-mono text-[0.6rem] tracking-[0.18em] text-white/45 uppercase">
                  Since {church.founded}
                </p>
              </div>
            </div>

            <address className="mt-6 text-sm leading-relaxed text-white/70 not-italic">
              {church.address.line1}
              <br />
              {church.address.city}, {church.address.country}
            </address>

            <a
              href={church.mapUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex items-center gap-2 rounded-sm text-sm text-white/80 underline-offset-4 hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)] focus-visible:outline-none"
            >
              Open in Maps
              <svg viewBox="0 0 16 16" aria-hidden focusable="false" className="size-3">
                <path
                  d="M2 8h11M9 4l4 4-4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>

            <p className="mt-6 text-xs leading-relaxed text-white/45">{church.denomination}</p>
          </div>

          {/* When. */}
          <div>
            <h2 className="font-mono text-[0.65rem] tracking-[0.2em] text-white/45 uppercase">
              Service times
            </h2>
            <dl className="mt-5 space-y-3.5">
              {[...sundayTimes, ...midweek].map((service) => (
                <div key={`${service.day}-${service.time}`} className="flex items-baseline gap-3">
                  <dt className="numeric w-14 shrink-0 text-sm text-white/85">{service.time}</dt>
                  <dd className="text-sm text-white/60">
                    {service.day}
                    <span className="mx-1.5 text-white/25">·</span>
                    {service.name}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* How to reach us. */}
          <div>
            <h2 className="font-mono text-[0.65rem] tracking-[0.2em] text-white/45 uppercase">
              Contact
            </h2>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a
                  href={`tel:${church.phone.replace(/\s/g, "")}`}
                  className="rounded-sm text-white/70 underline-offset-4 hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)] focus-visible:outline-none"
                >
                  {church.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${church.email}`}
                  className="rounded-sm text-white/70 underline-offset-4 [overflow-wrap:anywhere] hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)] focus-visible:outline-none"
                >
                  {church.email}
                </a>
              </li>
              <li>
                <Link
                  href="#visit"
                  className="rounded-sm text-white/70 underline-offset-4 hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)] focus-visible:outline-none"
                >
                  Plan your visit
                </Link>
              </li>
            </ul>

            <h2 className="mt-8 font-mono text-[0.65rem] tracking-[0.2em] text-white/45 uppercase">
              Follow
            </h2>
            <ul className="mt-5 space-y-3 text-sm">
              {socials.map((social) => (
                <li key={social.name}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-sm text-white/70 underline-offset-4 hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)] focus-visible:outline-none"
                  >
                    {social.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* The bulletin, and the way back up the page. */}
          <div>
            <h2 className="font-mono text-[0.65rem] tracking-[0.2em] text-white/45 uppercase">
              {bulletin.heading}
            </h2>
            <p className="mt-5 mb-5 text-sm leading-relaxed text-white/60 text-pretty">
              {bulletin.blurb}
            </p>
            <BulletinForm />

            <h2 className="mt-9 font-mono text-[0.65rem] tracking-[0.2em] text-white/45 uppercase">
              This page
            </h2>
            <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {explore.map((entry) => (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    className="rounded-sm text-white/70 underline-offset-4 hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)] focus-visible:outline-none"
                  >
                    {entry.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/12 pt-6 font-mono text-[0.65rem] tracking-wide text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {church.founded}–{new Date().getFullYear()} {church.name}
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link
              href="/privacy"
              className="rounded-sm underline-offset-4 hover:text-white/80 hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)] focus-visible:outline-none"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="rounded-sm underline-offset-4 hover:text-white/80 hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)] focus-visible:outline-none"
            >
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

/** Twelve spokes — the rose window, reduced to a mark. */
function RoseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" strokeWidth="1.25" />
      {Array.from({ length: 12 }, (_, spoke) => (
        <line
          key={spoke}
          x1="16"
          y1="4"
          x2="16"
          y2="12"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          transform={`rotate(${spoke * 30} 16 16)`}
        />
      ))}
    </svg>
  );
}
