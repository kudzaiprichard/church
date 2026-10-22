import { HandHeartIcon } from "lucide-react";
import type { Metadata } from "next";

import type { PledgeStatus } from "@/generated/prisma/enums";
import { requireSession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { paymentOptions } from "@/lib/data/finance";
import { groupOptions } from "@/lib/data/members";
import { allPledges, myPledges } from "@/lib/data/partnerships";

import { EmptyState, PageHeader, Panel } from "../../_components/page-parts";

import { PledgeForm } from "./pledge-form";
import { PledgeList } from "./pledge-list";

export const metadata: Metadata = { title: "Pledges" };

const STATUSES: PledgeStatus[] = ["ACTIVE", "FULFILLED", "CANCELLED"];

/**
 * Pledges (docs/SCOPE.md §9.10): a member's own, with progress from confirmed
 * payments, and — for `finance.viewAll` — everyone's, filterable. Overdue is
 * derived and drawn with a red border; Fulfilled is set automatically.
 */
export default async function PledgesPage(props: PageProps<"/finance/pledges">) {
  const user = await requireSession();
  const params = await props.searchParams;
  const officer = can(user, "finance.viewAll");

  const status = STATUSES.find((value) => value === params.status);
  const projectId = typeof params.project === "string" ? params.project : undefined;
  const groupId = typeof params.group === "string" ? params.group : undefined;

  const [mine, { projects }, all, groups] = await Promise.all([
    myPledges(user),
    paymentOptions(user),
    officer ? allPledges(user, { status, projectId, groupId }) : null,
    officer ? groupOptions() : [],
  ]);
  const control = "border-input bg-background mt-1.5 h-9 w-full rounded-lg border px-2 text-sm";

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Pledges"
        description="Promises to give a total by a date. Only confirmed payments count toward one."
      />

      <div className="grid max-w-4xl gap-4">
        <Panel title="Your pledges" bodyClassName="p-0">
          {mine.length === 0 ? (
            <EmptyState
              icon={<HandHeartIcon className="size-5" aria-hidden />}
              title="No pledges yet"
            >
              Make one below.
            </EmptyState>
          ) : (
            <PledgeList pledges={mine} />
          )}
        </Panel>

        <Panel title="Make a pledge">
          <PledgeForm projects={projects} />
        </Panel>

        {all && (
          <Panel
            title="Everyone's pledges"
            action={
              <form method="get" className="grid grid-cols-3 gap-2">
                <label className="text-xs font-semibold">
                  Status
                  <select name="status" defaultValue={status ?? ""} className={control}>
                    <option value="">Any</option>
                    {STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {value.charAt(0) + value.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  Project
                  <select name="project" defaultValue={projectId ?? ""} className={control}>
                    <option value="">Any</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  Group
                  <select name="group" defaultValue={groupId ?? ""} className={control}>
                    <option value="">Any</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="border-border hover:bg-muted col-span-3 h-8 cursor-pointer rounded-md border text-xs font-semibold"
                >
                  Filter
                </button>
              </form>
            }
            bodyClassName="p-0"
          >
            {all.length === 0 ? (
              <EmptyState
                icon={<HandHeartIcon className="size-5" aria-hidden />}
                title="None match"
              />
            ) : (
              <PledgeList pledges={all} showMember />
            )}
          </Panel>
        )}
      </div>
    </>
  );
}
