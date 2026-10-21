import { useId } from "react";

/**
 * The KMMI crest: a red globe on a royal-blue disc ringed in gold, a figure
 * with arms raised over it, the crown beneath, and the name lettered round the
 * ring.
 *
 * Fixed colours on purpose — this is the church's mark, and it reads the same
 * on paper, on the blue bands and in dark mode. The ring paths are given ids
 * from `useId` so several crests on one page never share a `textPath` target.
 */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  const id = useId();
  const top = `${id}-top`;
  const bottom = `${id}-bottom`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Kingdom Manifest Ministries International"
    >
      <circle cx="50" cy="50" r="48" fill="#1a3fcc" stroke="#c9a84c" strokeWidth="3" />
      <circle cx="50" cy="50" r="32" fill="#cc2a1a" />

      {/* Lines of latitude and longitude. */}
      <ellipse cx="50" cy="50" rx="32" ry="10" fill="none" stroke="#c9a84c" strokeWidth="1.2" />
      <ellipse cx="50" cy="50" rx="32" ry="20" fill="none" stroke="#c9a84c" strokeWidth="1" />
      <ellipse cx="50" cy="50" rx="10" ry="32" fill="none" stroke="#c9a84c" strokeWidth="1.2" />
      <ellipse cx="50" cy="50" rx="20" ry="32" fill="none" stroke="#c9a84c" strokeWidth="1" />
      <line x1="50" y1="18" x2="50" y2="82" stroke="#c9a84c" strokeWidth="1.2" />
      <line x1="18" y1="50" x2="82" y2="50" stroke="#c9a84c" strokeWidth="1.2" />

      {/* The figure, arms raised. */}
      <ellipse cx="50" cy="42" rx="4" ry="5" fill="white" />
      <circle cx="50" cy="35" r="4" fill="white" />
      <g stroke="white" strokeWidth="2.5" strokeLinecap="round">
        <line x1="46" y1="43" x2="36" y2="36" />
        <line x1="54" y1="43" x2="64" y2="36" />
        <line x1="48" y1="47" x2="45" y2="54" />
        <line x1="52" y1="47" x2="55" y2="54" />
      </g>

      {/* The crown. */}
      <g fill="#c9a84c">
        <path d="M32 75 L36 65 L42 72 L50 60 L58 72 L64 65 L68 75 Z" />
        <rect x="32" y="74" width="36" height="5" rx="2" />
        <circle cx="36" cy="65" r="2" />
        <circle cx="50" cy="60" r="2" />
        <circle cx="64" cy="65" r="2" />
      </g>

      <defs>
        <path id={top} d="M 10,50 A 40,40 0 0,1 90,50" />
        <path id={bottom} d="M 10,50 A 40,40 0 0,0 90,50" />
      </defs>
      <text fill="white" fontSize="6.5" fontFamily="var(--font-cinzel), serif" letterSpacing="0.8">
        <textPath href={`#${top}`} startOffset="5%">
          KINGDOM MANIFEST MINISTRIES
        </textPath>
      </text>
      <text fill="white" fontSize="6" fontFamily="var(--font-cinzel), serif" letterSpacing="0.5">
        <textPath href={`#${bottom}`} startOffset="20%">
          INTERNATIONAL
        </textPath>
      </text>
    </svg>
  );
}
