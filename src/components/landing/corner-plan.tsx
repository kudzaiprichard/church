import { cn } from "@/lib/utils";

/**
 * The corner, drawn.
 *
 * A third-party map would cost a script, a cookie notice and a layout shift to
 * tell a visitor something two streets and an arrow already say: which corner,
 * which side the door is on, where to leave the car. Everything it conveys is
 * also written in the text beside it, so it is hidden from assistive tech
 * rather than repeated to it.
 */
export function CornerPlan({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 180"
      className={cn("text-foreground h-auto w-full", className)}
      aria-hidden
      focusable="false"
    >
      {/* Josiah Chinamano Avenue, running east–west. */}
      <rect x="0" y="100" width="320" height="26" fill="currentColor" opacity="0.07" />
      <line
        x1="0"
        y1="113"
        x2="320"
        y2="113"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="9 9"
        opacity="0.2"
      />

      {/* Sixth Street, running north–south. */}
      <rect x="64" y="0" width="22" height="180" fill="currentColor" opacity="0.07" />
      <line
        x1="75"
        y1="0"
        x2="75"
        y2="180"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="9 9"
        opacity="0.2"
      />

      {/* The chapel, on the north-east corner. Held clear of the avenue so the
          entrance can be labelled in the gap between the two. */}
      <rect
        x="98"
        y="26"
        width="96"
        height="58"
        fill="var(--brass)"
        opacity="0.16"
        rx="2"
        stroke="none"
      />
      <rect
        x="98"
        y="26"
        width="96"
        height="58"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.4"
        rx="2"
      />
      {/* A lancet, so the block reads as the building and not as a car park. */}
      <path
        d="M140 76 L140 60 A6 6 0 0 1 152 60 L152 76 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.55"
      />

      {/* Parking, behind the hall. */}
      <rect
        x="206"
        y="30"
        width="52"
        height="50"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4 5"
        opacity="0.35"
        rx="2"
      />
      <text
        x="232"
        y="61"
        textAnchor="middle"
        fontSize="15"
        fill="currentColor"
        opacity="0.45"
        fontFamily="var(--font-mono)"
      >
        P
      </text>

      {/* The door, on the Sixth Street face. */}
      <line x1="86" y1="64" x2="98" y2="64" stroke="var(--brass)" strokeWidth="1.5" />
      <circle cx="98" cy="64" r="3.5" fill="var(--brass)" />

      <g fontFamily="var(--font-mono)" fontSize="8" fill="currentColor" letterSpacing="1.4">
        <text x="112" y="118" opacity="0.5">
          JOSIAH CHINAMANO
        </text>
        <text
          x="75"
          y="160"
          textAnchor="middle"
          opacity="0.5"
          transform="rotate(-90 75 160)"
          dy="3"
        >
          SIXTH
        </text>
        <text x="146" y="46" textAnchor="middle" opacity="0.65">
          CHAPEL
        </text>
        {/* In the gap between the building and the avenue, level with the door. */}
        <text x="98" y="95" opacity="0.6">
          ENTRANCE
        </text>
      </g>

      {/* North, because every plan has one. */}
      <g opacity="0.4">
        <line x1="300" y1="30" x2="300" y2="12" stroke="currentColor" strokeWidth="1" />
        <path d="M296 17 L300 11 L304 17" fill="none" stroke="currentColor" strokeWidth="1" />
        <text
          x="300"
          y="42"
          textAnchor="middle"
          fontSize="8"
          fill="currentColor"
          fontFamily="var(--font-mono)"
        >
          N
        </text>
      </g>
    </svg>
  );
}
