"use client";

import { useEffect } from "react";

/**
 * The last resort: the root layout itself failed.
 *
 * This file *replaces* the root layout when it renders, which drives every
 * unusual thing about it:
 *
 *   it declares its own <html> and <body>, because the ones in the layout
 *   never ran;
 *
 *   it carries its own styles inline. Global CSS is not loaded here, so every
 *   Tailwind class in the rest of the app would be an unstyled no-op — and the
 *   theme lives on a class that the layout sets, so `prefers-color-scheme` is
 *   the only signal available. That is why the palette below is duplicated
 *   rather than imported: it is the one place in this codebase that cannot
 *   reach the design tokens;
 *
 *   the title is a React <title> element, since a Client Component cannot
 *   export `metadata`.
 *
 * Keep it dependency-free. Anything imported here is something else that can
 * throw on a page that exists precisely because something already has.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <title>Something went wrong</title>

        <style>{`
          .shell {
            --paper: #faf7f2;
            --ink: #241b1e;
            --muted: #6d6167;
            --brass: #a8834a;
            min-height: 100svh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            padding: 3rem 1.5rem;
            text-align: center;
            background: var(--paper);
            color: var(--ink);
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
          }
          @media (prefers-color-scheme: dark) {
            .shell { --paper: #171013; --ink: #f2ebe6; --muted: #a3969b; --brass: #cba767; }
          }
          .code {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 0.7rem; letter-spacing: 0.3em; color: var(--muted); margin: 0;
          }
          .title { font-size: 1.9rem; line-height: 1.15; margin: 0.75rem 0 0; font-weight: 600; }
          .prose { color: var(--muted); max-width: 30rem; margin: 0.75rem 0 0; line-height: 1.6; font-size: 0.95rem; }
          .digest { color: var(--ink); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
          .again {
            margin-top: 2rem; padding: 0.7rem 1.4rem; border: 0; cursor: pointer;
            background: var(--brass); color: var(--paper); font: inherit; font-size: 0.85rem;
            border-radius: 2px;
          }
          .again:hover { filter: brightness(1.08); }
        `}</style>

        <div className="shell">
          {/* The rose window, inlined for the same reason the palette is. */}
          <svg viewBox="0 0 96 96" width="56" height="56" aria-hidden focusable="false">
            <circle cx="48" cy="48" r="44" fill="none" stroke="var(--brass)" strokeWidth="1.25" />
            <line x1="48" y1="26" x2="48" y2="70" stroke="var(--brass)" strokeWidth="2" />
            <line x1="33" y1="43" x2="63" y2="43" stroke="var(--brass)" strokeWidth="2" />
          </svg>

          <p className="code">500</p>
          <h1 className="title">Something went wrong</h1>
          <p className="prose">
            The application failed to start rendering. This is a fault at our end, and nothing you
            did caused it.
            {error.digest && (
              <>
                {" "}
                Quote <span className="digest">{error.digest}</span> if you report it.
              </>
            )}
          </p>

          <button type="button" className="again" onClick={() => retry()}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
