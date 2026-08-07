import { cn } from "@/lib/utils";

/**
 * The mark both loaders are built from: a cross inscribed in the rose window.
 *
 * It is the same twelve-spoke window the nav and the sign-in screen already
 * use, which is the point — a loader is the first thing anyone sees, so it
 * should be the site introducing itself rather than a borrowed spinner. The
 * cross draws itself in the middle of it.
 *
 * Every stroke carries `pathLength={100}`, which renormalises the geometry so
 * a dash array of 100 means "the whole line" whatever the actual arc length
 * is. Without it every animation would need the real circumference baked in as
 * a magic number, and changing the radius would silently break the drawing.
 */
export function RoseCross({
  mode = "seal",
  className,
}: {
  /**
   * `seal` draws the whole window and holds — for the boot overlay, where
   * there is room for a moment of ceremony.
   *
   * `orbit` keeps the window still and turns a bright arc around it — for
   * route changes, where the job is to say "working" without asking to be
   * watched.
   */
  mode?: "seal" | "orbit";
  className?: string;
}) {
  const spokes = Array.from({ length: 12 }, (_, index) => index);

  return (
    <svg
      viewBox="0 0 96 96"
      className={cn("overflow-visible", className)}
      aria-hidden
      focusable="false"
    >
      {/* The rim. In seal mode it inscribes itself; in orbit mode it is the
          quiet track the glint runs along. */}
      <circle
        cx="48"
        cy="48"
        r="44"
        pathLength={100}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        className={mode === "seal" ? "loader-rim" : "opacity-20"}
      />

      {/* Twelve spokes, kindling in turn. The delay is per index rather than a
          single animation on a group, so the light travels round the window. */}
      <g className={mode === "seal" ? "loader-spokes" : "opacity-15"}>
        {spokes.map((spoke) => (
          <line
            key={spoke}
            x1="48"
            y1="17"
            x2="48"
            y2="30"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            transform={`rotate(${spoke * 30} 48 48)`}
            style={{ "--spoke": spoke } as React.CSSProperties}
          />
        ))}
      </g>

      {/* The cross. Drawn upright first, then across — the order matters, it is
          what makes it read as being written rather than fading up. */}
      <g
        className={mode === "seal" ? "loader-cross" : "loader-cross-still"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      >
        <line x1="48" y1="26" x2="48" y2="70" pathLength={100} className="loader-limb-upright" />
        <line x1="33" y1="43" x2="63" y2="43" pathLength={100} className="loader-limb-across" />
      </g>

      {/* The glint, only in orbit mode: a short arc travelling the rim. */}
      {mode === "orbit" && (
        <circle
          cx="48"
          cy="48"
          r="44"
          pathLength={100}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="loader-glint"
        />
      )}
    </svg>
  );
}
