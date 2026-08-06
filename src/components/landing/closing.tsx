import Link from "next/link";

import { church, services } from "@/lib/church";

const columns = [
  { label: "Visit", href: "#visit" },
  { label: "Ministries", href: "#ministries" },
  { label: "Sermons", href: "#sermons" },
  { label: "What's on", href: "#events" },
];

export function Closing() {
  return (
    <footer className="text-white" style={{ backgroundColor: "oklch(0.185 0.03 350)" }}>
      <div aria-hidden className="h-[3px]" style={{ backgroundColor: "oklch(0.62 0.1 78)" }} />

      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <RoseMark className="size-7 shrink-0 text-white/70" />
            <div>
              <p className="font-heading text-sm leading-none">{church.name}</p>
              <p className="mt-1.5 font-mono text-[0.65rem] tracking-[0.15em] text-white/45 uppercase">
                {church.address.line1}, {church.address.city}
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-7 gap-y-2">
            {columns.map((column) => (
              <Link
                key={column.href}
                href={column.href}
                className="text-sm text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {column.label}
              </Link>
            ))}
          </nav>

          <div className="font-mono text-[0.7rem] tracking-wide text-white/55">
            {services
              .filter((service) => service.day === "Sunday")
              .map((service) => service.time)
              .join(" · ")}{" "}
            Sundays
            <span className="mx-2 text-white/25">|</span>
            <a href={`tel:${church.phone.replace(/\s/g, "")}`} className="hover:text-white">
              {church.phone}
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/12 pt-5 font-mono text-[0.65rem] tracking-wide text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {church.founded}–2026 {church.name}
          </p>
          <p>Member sign-in opens with the authentication module.</p>
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
