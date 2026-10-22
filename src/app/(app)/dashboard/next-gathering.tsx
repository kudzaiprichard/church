"use client";

import { ClockIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { nextGathering, whenLabel } from "@/lib/next-gathering";

/** Nothing to subscribe to — the answer only ever goes from false to true. */
const noSubscription = () => () => {};

/**
 * The next Sunday or midweek service, as one row of the "Coming up" widget.
 *
 * The answer depends on the reader's clock, so the server ships the standing
 * times and the live answer replaces them once hydrated — both in the same
 * row, so nothing shifts (see the public site's NextGatheringLine).
 */
export function NextGathering() {
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const next = hydrated ? nextGathering(new Date()) : null;

  return (
    <div className="bg-secondary flex items-center gap-3 rounded-md px-3 py-2.5">
      <ClockIcon className="text-primary size-4 shrink-0" aria-hidden />
      <p className="min-w-0 text-sm">
        {next ? (
          <>
            <span className="text-foreground font-semibold">
              {whenLabel(next)} <span className="numeric">{next.time}</span>
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {next.name}, {next.place}
            </span>
          </>
        ) : (
          <span className="text-foreground font-semibold">
            Sundays <span className="numeric">08:00</span> and{" "}
            <span className="numeric">10:30</span>
          </span>
        )}
      </p>
    </div>
  );
}
