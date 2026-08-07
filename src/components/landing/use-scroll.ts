"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True once the user has asked for reduced motion. Every animation here checks it. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/**
 * Fires once when an element first enters the viewport. Used for reveals, which
 * should play on arrival and then stay put — not replay on every scroll past.
 */
export function useInView<T extends HTMLElement>(
  options: { rootMargin?: string; threshold?: number } = {},
): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const { rootMargin = "0px 0px -12% 0px", threshold = 0.15 } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Without an observer there is nothing to wait for — show the content.
    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setInView(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return [ref, inView];
}

/**
 * 0 → 1 as an element travels through the viewport. Read inside rAF so a fast
 * scroll can't queue more work than a frame can spend.
 */
export function useScrollProgress<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      frame.current = null;
      const rect = element.getBoundingClientRect();
      const travel = window.innerHeight + rect.height;
      const seen = window.innerHeight - rect.top;
      setProgress(Math.min(1, Math.max(0, seen / travel)));
    };

    const schedule = () => {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  return [ref, progress];
}
