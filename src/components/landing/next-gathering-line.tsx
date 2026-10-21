"use client";

import { useSyncExternalStore } from "react";

import { nextGathering, whenLabel } from "@/lib/next-gathering";

/** Nothing to subscribe to — the answer only ever goes from false to true. */
const noSubscription = () => () => {};

/**
 * "Next gathering — Tomorrow 18:00".
 *
 * The answer depends on the clock, and the clock is not the same on the server
 * as it is in the reader's browser a second later. So the markup ships with the
 * standing answer (which is true whenever it is read) and the live one takes
 * over once we are on the client. Nothing shifts: both occupy the same row.
 *
 * `useSyncExternalStore` rather than an effect that sets state — it is the API
 * built for "the server and the client disagree, and the client is right".
 */
export function NextGatheringLine() {
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

  const next = hydrated ? nextGathering(new Date()) : null;

  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-accent-foreground text-xs font-semibold tracking-[0.14em] uppercase">
        {next ? "Next gathering" : "Sundays"}
      </span>

      {next ? (
        <span className="flex items-baseline gap-2.5">
          <span className="text-foreground text-sm">{whenLabel(next)}</span>
          <span className="numeric text-foreground text-lg leading-none">{next.time}</span>
          <span className="text-muted-foreground text-sm">
            {next.name.toLowerCase()}, {next.place.toLowerCase()}
          </span>
        </span>
      ) : (
        <span className="flex items-baseline gap-2.5">
          <span className="numeric text-foreground text-lg leading-none">08:00</span>
          <span className="text-muted-foreground text-sm">and</span>
          <span className="numeric text-foreground text-lg leading-none">10:30</span>
        </span>
      )}
    </p>
  );
}
