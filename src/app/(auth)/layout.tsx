import Link from "next/link";

/**
 * The shell every sign-in screen sits in: one centred column on the page's own
 * paper, no navigation. Somebody on these screens has exactly one thing to do,
 * and offering them the rest of the site is only a way to lose them.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="focus-visible:ring-ring mb-10 flex items-center gap-3 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <RoseMark className="text-accent-foreground size-8 shrink-0" />
          <span className="font-heading text-base leading-none">
            Church
            <span className="text-muted-foreground mt-1.5 block font-mono text-[0.6rem] tracking-[0.18em] uppercase">
              Member area
            </span>
          </span>
        </Link>

        {children}
      </div>
    </div>
  );
}

/** Twelve spokes — the same mark the public site uses. */
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
