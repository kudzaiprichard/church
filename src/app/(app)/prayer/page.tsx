import { HandHeartIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requireSession } from "@/lib/auth/dal";
import { prayerBoard } from "@/lib/data/prayer";
import { cn } from "@/lib/utils";

import { EmptyState, PageHeader, Panel } from "../_components/page-parts";

import { PrayerList } from "./prayer-board";
import { PrayerForm } from "./prayer-form";

export const metadata: Metadata = { title: "Prayer requests" };

/**
 * Prayer requests, one tab per group (docs/SCOPE.md §9.8). `?group=` picks the
 * tab and is honoured only for one of the caller's groups; Apostles also get
 * "All".
 */
export default async function PrayerPage(props: PageProps<"/prayer">) {
  const user = await requireSession();
  const { group } = await props.searchParams;
  const board = await prayerBoard(user, typeof group === "string" ? group : undefined);
  const apostle = user.role === "APOSTLE";
  const selectedName = board.groups.find((entry) => entry.id === board.selected)?.name;

  const tab = (id: string | null, label: string) => (
    <Link
      key={id ?? "all"}
      href={id ? `/prayer?group=${id}` : "/prayer"}
      aria-current={board.selected === id ? "page" : undefined}
      className={cn(
        "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
        board.selected === id
          ? "border-primary text-foreground"
          : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        eyebrow="Church life"
        title="Prayer requests"
        description="Requests stay within each connect group. Your group's leader is told when you post."
      />

      {board.groups.length === 0 ? (
        <div className="bg-card border-border max-w-3xl rounded-xl border">
          <EmptyState
            icon={<HandHeartIcon className="size-5" aria-hidden />}
            title="You are not in a group yet"
          >
            Prayer requests are shared within connect groups. Ask the church office to add you to
            one.
          </EmptyState>
        </div>
      ) : (
        <>
          <nav
            aria-label="Groups"
            className="border-border mb-4 flex max-w-3xl gap-1 overflow-x-auto border-b"
          >
            {apostle && tab(null, "All")}
            {board.groups.map((entry) => tab(entry.id, entry.name))}
          </nav>

          <div className="grid max-w-3xl gap-4">
            {board.canPost && board.selected && selectedName && (
              <Panel>
                <PrayerForm groupId={board.selected} groupName={selectedName} />
              </Panel>
            )}
            <Panel
              title={selectedName ?? "Every group"}
              description="Pinned first, then newest."
              bodyClassName="p-0"
            >
              <PrayerList items={board.items} showGroup={board.selected === null} />
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
