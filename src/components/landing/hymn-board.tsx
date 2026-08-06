"use client";

import { cn } from "@/lib/utils";

import { useInView, usePrefersReducedMotion } from "./use-scroll";

import { lastSunday as slots } from "@/lib/church";

/**
 * The hymn board: a slotted rail of number cards. Digits roll into place the
 * way the real cards drop in, one slot after another.
 */
export function HymnBoard() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.4 });
  const reduced = usePrefersReducedMotion();
  const settled = inView || reduced;

  return (
    <div ref={ref}>
      {/* A real hymn board: dark timber, brass rails, cards dropped into slots. */}
      <div
        className="relative px-6 py-12 shadow-[0_1px_0_var(--border)] sm:px-12"
        style={{ backgroundColor: "oklch(0.22 0.026 350)" }}
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: "oklch(0.62 0.1 78)" }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[3px]" style={{ backgroundColor: "oklch(0.62 0.1 78)" }} />

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {slots.map((slot, slotIndex) => (
            <div key={slot.label} className="text-center text-white">
              {/* The slot the card sits in. */}
              <div
                className="mx-auto flex justify-center border-b px-2 pb-2"
                style={{ borderColor: "oklch(0.62 0.1 78 / 0.45)" }}
                aria-hidden
              >
                {slot.value.split("").map((character, index) => (
                  <Digit
                    key={`${slot.label}-${index}`}
                    character={character}
                    settled={settled}
                    reduced={reduced}
                    delay={slotIndex * 160 + index * 70}
                  />
                ))}
              </div>
              {/* The plain value, for anyone the animation would only get in the way of. */}
              <span className="sr-only">{slot.value}</span>
              <p className="mt-4 font-mono text-[0.7rem] tracking-[0.18em] text-white/55 uppercase">
                {slot.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-muted-foreground mt-5 text-center font-mono text-xs">
        Illustrative figures — not data from any congregation.
      </p>
    </div>
  );
}

function Digit({
  character,
  settled,
  reduced,
  delay,
}: {
  character: string;
  settled: boolean;
  reduced: boolean;
  delay: number;
}) {
  // Punctuation sits in the rail without rolling.
  if (!/\d/.test(character)) {
    return <span className="numeric text-3xl sm:text-4xl">{character}</span>;
  }

  const target = Number(character);

  return (
    <span className="numeric relative inline-block h-[1.15em] overflow-hidden text-3xl tabular-nums sm:text-4xl">
      {/* Reserve the column so the board doesn't reflow as digits land. */}
      <span className="invisible">0</span>
      <span
        className={cn(
          "absolute inset-x-0 top-0 flex flex-col transition-transform duration-1000 ease-out",
          "motion-reduce:transition-none",
        )}
        style={{
          transform: `translateY(${settled ? -target * 1.15 : -11.5}em)`,
          transitionDelay: reduced ? undefined : `${delay}ms`,
        }}
      >
        {Array.from({ length: 11 }, (_, index) => (
          <span key={index} className="h-[1.15em] leading-[1.15em]">
            {index % 10}
          </span>
        ))}
      </span>
    </span>
  );
}
