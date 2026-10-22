import { formatMoney, type Cents } from "@/lib/finance/money";
import { cn } from "@/lib/utils";

/**
 * An amount, formatted in the church's locale with tabular figures so columns
 * of them line up. `pending` draws it in amber: logged, not yet money received.
 */
export function Money({
  cents,
  pending,
  className,
}: {
  cents: Cents;
  pending?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "numeric whitespace-nowrap",
        cents < 0 && "text-destructive",
        pending && "text-accent-foreground",
        className,
      )}
    >
      {formatMoney(cents)}
    </span>
  );
}
