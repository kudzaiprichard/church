import { ArrowLeftIcon, HandCoinsIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { getProject } from "@/lib/data/partnerships";
import { formatDateOnly } from "@/lib/dates";
import { sumCents } from "@/lib/finance/money";
import { progress } from "@/lib/finance/pledges";

import { Money } from "../../_components/money";
import { EmptyState, PageHeader, Panel } from "../../_components/page-parts";
import { ProjectStatusBadge, Progress } from "../../finance/finance-parts";
import { CompleteProjectForm, ProjectForm } from "../project-form";

export const metadata: Metadata = { title: "Partnership project" };

/**
 * One project (docs/SCOPE.md §9.10): progress for everyone; the contributor
 * table for the Apostles and the Elder (`finance.viewAll`); only their own
 * contributions for anyone else. Apostles edit and complete it here.
 */
export default async function ProjectPage(props: PageProps<"/partnerships/[id]">) {
  const user = await requireSession();
  const { id } = await props.params;

  const project = await getProject(user, id);
  if (!project) notFound();

  const bar = progress(project.raisedCents, project.targetCents);
  const manages = can(user, "projects.manage");

  return (
    <>
      <Link
        href="/partnerships"
        className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        Partnerships
      </Link>

      <PageHeader
        eyebrow="Partnership project"
        title={project.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <span>
              From {formatDateOnly(project.startDate)}
              {project.endDate && ` to ${formatDateOnly(project.endDate)}`}
              {project.status === "ACTIVE" &&
                project.daysLeft !== null &&
                ` · ${project.daysLeft} days left`}
            </span>
          </span>
        }
      />

      <div className="grid max-w-4xl gap-4">
        <Panel>
          {project.description && (
            <p className="text-foreground mb-4 text-sm leading-relaxed whitespace-pre-line">
              {project.description}
            </p>
          )}
          <Progress value={bar.real} label={`${project.name} progress`} />
          <p className="text-muted-foreground mt-2 text-sm">
            <Money cents={project.raisedCents} className="text-foreground font-semibold" /> raised of{" "}
            <Money cents={project.targetCents} /> — confirmed giving only.
          </p>
        </Panel>

        <Panel
          title={project.seesAll ? "Contributors" : "Your contributions"}
          description={
            project.seesAll
              ? `${project.contributions.length} confirmed contributions.`
              : project.contributions.length === 0
                ? "You have not given to it yet."
                : "Your confirmed giving to it."
          }
          bodyClassName="p-0"
        >
          {project.contributions.length === 0 ? (
            <EmptyState
              icon={<HandCoinsIcon className="size-5" aria-hidden />}
              title="No contributions yet"
            >
              {project.status === "ACTIVE"
                ? "Give from My giving → Log payment → Partnership."
                : null}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border text-muted-foreground border-b text-xs">
                    {project.seesAll && (
                      <th scope="col" className="px-5 py-2 text-left font-semibold">
                        Member
                      </th>
                    )}
                    <th scope="col" className="px-5 py-2 text-left font-semibold">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">
                      Note
                    </th>
                    <th scope="col" className="px-5 py-2 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {project.contributions.map((entry) => (
                    <tr key={entry.id}>
                      {project.seesAll && (
                        <td className="px-5 py-2.5">
                          <Link
                            href={`/members/${entry.member.id}?tab=giving`}
                            className="font-medium hover:underline"
                          >
                            {entry.member.name}
                          </Link>
                          <span className="text-muted-foreground block text-xs">
                            {entry.groups.join(", ") || "No group"}
                          </span>
                        </td>
                      )}
                      <td className="px-5 py-2.5 whitespace-nowrap">{formatDateOnly(entry.paidAt)}</td>
                      <td className="text-muted-foreground px-3 py-2.5 text-xs">{entry.note}</td>
                      <td className="px-5 py-2.5 text-right">
                        <Money cents={entry.cents} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-border border-t font-semibold">
                    <td colSpan={project.seesAll ? 3 : 2} className="px-5 py-2.5">
                      Total
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <Money cents={sumCents(project.contributions.map((entry) => entry.cents))} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Panel>

        {manages && (
          <>
            <Panel title="Edit project">
              <ProjectForm
                projectId={project.id}
                stored={{
                  name: project.name,
                  description: project.description,
                  targetAmount: project.targetAmount,
                  startDate: project.startDate,
                  endDate: project.endDate,
                }}
              />
            </Panel>
            {project.status === "ACTIVE" && (
              <Panel title="Complete">
                <CompleteProjectForm projectId={project.id} name={project.name} />
              </Panel>
            )}
          </>
        )}
      </div>
    </>
  );
}
