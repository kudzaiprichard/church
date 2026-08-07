import Link from "next/link";

/**
 * The mark at the head of the sidebar — the same twelve-spoke rose the public
 * site uses, so the member area is recognisably the same building.
 */
export function WordMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      title={collapsed ? "Cornerstone — church system" : undefined}
      className="focus-visible:ring-sidebar-ring flex items-center gap-3 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
    >
      <RoseMark className="text-sidebar-primary size-7 shrink-0" />

      {/* The words go, the mark stays — a rail with nothing recognisable at the
          top of it stops reading as the same product. */}
      {!collapsed && (
        <span className="min-w-0">
          <span className="font-heading block truncate text-sm leading-none">Cornerstone</span>
          <span className="text-sidebar-foreground/50 mt-1 block font-mono text-[0.55rem] tracking-[0.18em] uppercase">
            Church system
          </span>
        </span>
      )}
    </Link>
  );
}

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
