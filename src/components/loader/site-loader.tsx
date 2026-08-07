import { church } from "@/lib/church";

import { RoseCross } from "./rose-cross";

/**
 * The lid over the whole site on a cold load or a refresh.
 *
 * Deliberately not a Client Component and deliberately not driven by React
 * state. The one job here is to be on screen in the *first* painted frame,
 * before hydration — a loader that appears once the JavaScript has arrived has
 * missed the only moment it was needed. So the markup is server-rendered and
 * the only behaviour is the small script below.
 *
 * It clears on `load` rather than on `DOMContentLoaded`, which is the whole
 * ask: `load` waits for stylesheets, fonts and images, so the site is revealed
 * finished rather than assembling itself in front of the reader.
 */
export function SiteLoader() {
  return (
    <>
      <div id="site-loader" aria-hidden>
        <div className="flex flex-col items-center">
          <RoseCross mode="seal" className="text-brass size-20" />

          <p className="font-heading mt-8 text-lg leading-none">{church.shortName}</p>

          {/* The travelling hairline. Sized here, animated in globals.css. */}
          <span className="bg-border relative mt-5 block h-px w-28 overflow-hidden">
            <span className="wait-rule absolute inset-0 block" />
          </span>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: REVEAL_ON_LOAD }} />
    </>
  );
}

/**
 * Inline, and inline on purpose: it has to run while the document is still
 * parsing, so it cannot wait on a bundle. The CSP already allows
 * `script-src 'unsafe-inline'` because Next streams its RSC payload the same
 * way, so this adds no new latitude.
 *
 * Three cases, all of which end with the site visible:
 *
 *   the usual one — `load` fires and the overlay clears, but never before
 *   MIN_MS, because an overlay that flashes for 80ms on a warm cache is more
 *   jarring than no overlay at all;
 *
 *   already finished — a bfcache restore or a script that ran late means
 *   `load` has been and gone, so `readyState` is checked directly rather than
 *   waiting for an event that will never fire again;
 *
 *   something is broken — one slow image or a hanging font request must not
 *   leave anybody staring at a lid, so MAX_MS lifts it regardless. The site
 *   underneath is perfectly usable; this is a nicety, not a gate.
 */
const REVEAL_ON_LOAD = `(function () {
  var el = document.documentElement, MIN_MS = 700, MAX_MS = 6000, started = Date.now();
  function reveal() { el.setAttribute('data-site-ready', ''); }
  function onLoad() { setTimeout(reveal, Math.max(0, MIN_MS - (Date.now() - started))); }
  if (document.readyState === 'complete') onLoad();
  else window.addEventListener('load', onLoad, { once: true });
  setTimeout(reveal, MAX_MS);
})();`;
