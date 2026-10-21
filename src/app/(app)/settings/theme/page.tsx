import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requirePermission } from "@/lib/auth/dal";
import { harareToday } from "@/lib/dates";
import { lastUpdatedLine } from "@/lib/last-updated";
import { getThemes, type Theme } from "@/lib/settings";
import { cn } from "@/lib/utils";

import { Panel } from "../../_components/page-parts";

import { ThemeForm, type ThemeDefaults } from "./theme-form";

export const metadata: Metadata = { title: "Theme of the Year" };

function defaultsFrom(theme: Theme): ThemeDefaults {
  return {
    year: String(theme.year),
    title: theme.title,
    scriptureRef: theme.scriptureRef,
    verseText: theme.verseText,
    description: theme.description ?? "",
  };
}

/**
 * The Theme of the Year and its history (SCOPE §9.17). Apostles only.
 *
 * `?year=` picks which year the form edits; `?year=new` starts the next one.
 * With neither, it edits the current theme.
 */
export default async function ThemePage(props: PageProps<"/settings/theme">) {
  await requirePermission("settings.manage");
  const { year } = await props.searchParams;
  const { current, history } = await getThemes();
  const all = current ? [current, ...history] : history;

  const nextYear = Math.max(Number(harareToday().slice(0, 4)), (current?.year ?? 0) + 1);
  const editing =
    year === "new" ? null : (all.find((theme) => String(theme.year) === year) ?? current);
  const stored: ThemeDefaults = editing
    ? defaultsFrom(editing)
    : { year: String(nextYear), title: "", scriptureRef: "", verseText: "", description: "" };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel
        title={
          editing
            ? `${editing.year}${editing === current ? " · current theme" : ""}`
            : "A new year's theme"
        }
        description={
          editing
            ? lastUpdatedLine(editing.updatedBy, editing.updatedAt)
            : "The highest year is always the current theme."
        }
        action={
          editing && (
            <Link
              href="/settings/theme?year=new"
              className="border-border hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              <PlusIcon className="size-3.5" aria-hidden />
              New year
            </Link>
          )
        }
      >
        <ThemeForm stored={stored} />
      </Panel>

      <Panel
        title="History"
        description="Every year's theme. Choose one to correct it."
        bodyClassName="p-0"
      >
        {all.length === 0 ? (
          <p className="text-muted-foreground px-5 py-6 text-sm">No themes yet.</p>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">Themes of previous years</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Theme</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {all.map((theme) => {
                const selected = editing?.year === theme.year;
                return (
                  <tr key={theme.year} className={cn(selected && "bg-secondary/50")}>
                    <th
                      scope="row"
                      className="numeric text-foreground w-16 px-5 py-3 text-left align-top font-semibold"
                    >
                      {theme.year}
                    </th>
                    <td className="py-3 pr-5">
                      <Link
                        href={`/settings/theme?year=${theme.year}`}
                        aria-current={selected ? "true" : undefined}
                        className="text-foreground rounded-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                      >
                        {theme.title}
                      </Link>
                      <p className="text-muted-foreground text-xs">{theme.scriptureRef}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
