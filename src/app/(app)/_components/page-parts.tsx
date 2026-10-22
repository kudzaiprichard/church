import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The building blocks every page in the member area is made of, so the pages
 * themselves stay about their data and all read as one system.
 *
 *   PageHeader    the title, a line of context, and the page's own actions
 *   PageGrid      the page's content beside a column of widgets
 *   Panel         a flat surface with an optional header row
 *   StatCard      one figure, its label, and where it leads
 *   QuickActions  the few things this page is usually opened to do
 *   FactList      label-and-value rows, for a widget's figures
 *
 * Flat throughout: a hairline on the canvas does the separating, never a
 * shadow. Compact: 16 px inside a panel, 16 px between panels, so a laptop
 * screen holds a page's working set without scrolling.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  /** Kept for the pages that still pass it; the breadcrumb says the same. */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-foreground text-2xl leading-tight font-semibold text-balance sm:text-[1.65rem]">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-relaxed text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Content and a column of widgets. The aside stacks under the content below
 * lg; `asideFirst` puts it above instead, for asides that summarise what
 * follows.
 */
export function PageGrid({
  aside,
  asideFirst = false,
  className,
  children,
}: {
  aside: ReactNode;
  asideFirst?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]",
        className,
      )}
    >
      <div className={cn("grid min-w-0 gap-4", asideFirst && "order-2 lg:order-1")}>{children}</div>
      <aside className={cn("grid min-w-0 gap-4", asideFirst && "order-1 lg:order-2")}>
        {aside}
      </aside>
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Override the body's padding — lists usually want to run edge to edge. */
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn("bg-card border-border min-w-0 overflow-hidden rounded-lg border", className)}
    >
      {(title || action) && (
        <header className="border-border flex items-start justify-between gap-4 border-b px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-foreground text-sm font-semibold">{title}</h2>}
            {description && (
              <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed text-pretty">
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: ReactNode;
  /** Where the figure is explained in full. */
  href?: string;
  /** `attention` for a figure that asks for action (something to review). */
  tone?: "default" | "attention";
}) {
  const body = (
    <>
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-md [&_svg]:size-3.5",
            // Gold for an ordinary figure; solid blue when it asks for action.
            tone === "attention"
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-accent-foreground",
          )}
        >
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      <p
        className={cn(
          "font-title numeric text-foreground mt-2.5 leading-none font-semibold",
          // A word ("Not paid yet") at headline size wraps on a phone; figures don't.
          typeof value === "string" && !/\d/.test(value) ? "text-lg sm:text-xl" : "text-[1.7rem]",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-muted-foreground mt-1.5 truncate text-xs">{hint}</p>}
    </>
  );

  const frame = "bg-card border-border block min-w-0 rounded-lg border p-4";
  return href ? (
    <Link
      href={href}
      className={cn(
        frame,
        "hover:border-foreground/25 focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  );
}

/** The shortcuts a page is usually opened for, as a widget. */
export function QuickActions({
  title = "Quick actions",
  actions,
}: {
  title?: string;
  actions: { href: string; label: string; icon: ReactNode; hint?: string }[];
}) {
  if (actions.length === 0) return null;
  return (
    <Panel title={title} bodyClassName="p-1.5">
      <ul className="grid gap-px">
        {actions.map((action) => (
          <li key={action.href + action.label}>
            <Link
              href={action.href}
              className="group hover:bg-muted focus-visible:ring-ring flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="bg-accent text-accent-foreground grid size-8 shrink-0 place-items-center rounded-md [&_svg]:size-4">
                {action.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-foreground block text-sm font-medium">{action.label}</span>
                {action.hint && (
                  <span className="text-muted-foreground block truncate text-xs">
                    {action.hint}
                  </span>
                )}
              </span>
              <ArrowRightIcon
                className="text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Label-and-value rows: a widget's handful of figures. */
export function FactList({
  facts,
}: {
  facts: { label: ReactNode; value: ReactNode; href?: string }[];
}) {
  return (
    <dl className="divide-border -my-1 divide-y">
      {facts.map((fact, index) => (
        <div key={index} className="flex items-baseline justify-between gap-3 py-2 text-sm">
          <dt className="text-muted-foreground min-w-0 truncate">{fact.label}</dt>
          <dd className="numeric text-foreground shrink-0 font-semibold">
            {fact.href ? (
              <Link href={fact.href} className="hover:text-primary hover:underline">
                {fact.value}
              </Link>
            ) : (
              fact.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** "See all" at the foot of a widget. */
export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-primary focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm text-xs font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
    >
      {children}
      <ArrowRightIcon className="size-3.5" aria-hidden />
    </Link>
  );
}

/** A quiet empty state, with the one thing to do about it. */
export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <span className="bg-muted text-muted-foreground grid size-10 place-items-center rounded-lg [&_svg]:size-5">
        {icon}
      </span>
      <p className="text-foreground mt-3 text-sm font-semibold">{title}</p>
      {children && (
        <div className="text-muted-foreground mt-1 max-w-sm text-xs leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

const CHIP_MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const CHIP_DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

/** A calendar day as a small tile — month above, day number below. `date` is YYYY-MM-DD. */
export function DateChip({ date, highlight = false }: { date: string; highlight?: boolean }) {
  const day = new Date(`${date}T00:00:00Z`);
  return (
    <span
      aria-hidden
      className={cn(
        "grid w-11 shrink-0 place-items-center rounded-md py-1 leading-none",
        highlight ? "bg-brass/25 text-foreground" : "bg-muted text-foreground",
      )}
    >
      <span className="text-muted-foreground text-[0.65rem] font-medium">
        {CHIP_MONTH.format(day)}
      </span>
      <span className="font-title numeric mt-0.5 text-base font-semibold">{day.getUTCDate()}</span>
      <span className="text-muted-foreground mt-0.5 text-[0.6rem]">{CHIP_DAY.format(day)}</span>
    </span>
  );
}
