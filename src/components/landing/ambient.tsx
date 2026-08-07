/**
 * The ground the page sits on.
 *
 * Nothing is drawn on it. It is one solid colour that falls away towards the
 * edges of the window, so the surface reads as carrying on past the frame
 * rather than stopping at it — the page is sitting on something deep instead
 * of on a flat panel. That is the whole idea, and it is deliberately the only
 * one: no shapes, no pattern, no coloured light, nothing moving.
 *
 * The fall-off is the same hue as the page and holds the middle completely
 * clear to about half its radius, which is where all the reading happens. On
 * ink it goes much further than on paper, and that is where the depth really
 * tells.
 *
 * Two static layers and no JavaScript at all.
 */
export function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="depth-field absolute inset-0" />

      {/* The tooth of the surface. One repeating tile, low enough to be felt
          rather than seen — it stops the flat areas reading as screen, and it
          dithers the fall-off so it can never band. */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
