import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The building blocks every page in the member area is made of, so the pages
 * themselves stay about their data and all read as one system.
 *
 *   PageHeader  a small gold-dot label, the title, a line of context, actions
 *   Panel       a flat card on the canvas, with its own header row
 *   StatCard    one figure, its label, and an icon to find it by
 *
 * Flat throughout — a 1px border on the canvas does the separating, never a
 * shadow — to match the public site.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-accent-foreground inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
            <span aria-hidden className="bg-brass size-1.5 rounded-full" />
            {eyebrow}
          </p>
        )}
        <h1 className="text-navy mt-2 text-2xl leading-tight font-bold text-balance sm:text-[1.75rem]">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
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
    <section className={cn("bg-card border-border overflow-hidden rounded-xl border", className)}>
      {(title || action) && (
        <header className="border-border flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-foreground text-sm font-bold">{title}</h2>}
            {description && (
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed text-pretty">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-card border-border rounded-xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <span className="bg-secondary text-primary grid size-9 shrink-0 place-items-center rounded-lg">
          {icon}
        </span>
      </div>
      <p className="numeric text-foreground mt-3 text-3xl leading-none font-semibold">{value}</p>
      {hint && <p className="text-muted-foreground mt-2 text-xs">{hint}</p>}
    </div>
  );
}

/** A quiet empty state for a panel with nothing in it yet. */
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
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span className="bg-secondary text-primary grid size-11 place-items-center rounded-xl">
        {icon}
      </span>
      <p className="text-foreground mt-3 text-sm font-semibold">{title}</p>
      {children && (
        <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed">{children}</p>
      )}
    </div>
  );
}
