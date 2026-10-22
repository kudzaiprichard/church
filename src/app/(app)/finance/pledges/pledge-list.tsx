import type { PledgeRow } from "@/lib/data/partnerships";
import { formatDateOnly } from "@/lib/dates";
import { progress } from "@/lib/finance/pledges";
import { cn } from "@/lib/utils";

import { Money } from "../../_components/money";
import { cancelPledge } from "../actions";
import { PledgeBadge, Progress } from "../finance-parts";

/**
 * Pledges with their progress. Overdue ones get a red edge. "Cancel" is
 * offered on every active one shown — the viewer's own, or anyone's to a
 * finance officer — and `cancelPledge` checks which again.
 */
export function PledgeList({
  pledges,
  showMember,
}: {
  pledges: PledgeRow[];
  showMember?: boolean;
}) {
  return (
    <ul className="divide-border divide-y">
      {pledges.map((pledge) => {
        const bar = progress(pledge.paidCents, pledge.totalCents);
        return (
          <li
            key={pledge.id}
            className={cn(
              "px-5 py-4",
              pledge.state === "OVERDUE" && "border-destructive border-l-4",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-foreground text-sm font-semibold">{pledge.description}</p>
                <p className="text-muted-foreground text-xs">
                  {showMember && `${pledge.member.name} · `}
                  {pledge.project ? `${pledge.project.name} · ` : ""}
                  due {formatDateOnly(pledge.dueDate)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <PledgeBadge state={pledge.state} />
                {pledge.status === "ACTIVE" && (
                  <form action={cancelPledge.bind(null, pledge.id)}>
                    <button
                      type="submit"
                      className="border-border hover:bg-muted h-7 cursor-pointer rounded-md border px-2.5 text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            </div>
            <div className="mt-3">
              <Progress value={bar.real} label={`${pledge.description} paid`} />
              <p className="text-muted-foreground mt-1 text-xs">
                <Money cents={pledge.paidCents} className="text-foreground font-semibold" /> of{" "}
                <Money cents={pledge.totalCents} />
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
