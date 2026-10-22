import { HandCoinsIcon, WalletIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requireSession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { listProjects } from "@/lib/data/partnerships";
import { harareToday } from "@/lib/dates";
import { progress } from "@/lib/finance/pledges";

import { Money } from "../_components/money";
import {
  EmptyState,
  FactList,
  PageGrid,
  PageHeader,
  Panel,
  QuickActions,
} from "../_components/page-parts";
import { ProjectStatusBadge, Progress } from "../finance/finance-parts";

import { ProjectForm } from "./project-form";

export const metadata: Metadata = { title: "Partnerships" };

/**
 * The church's partnership projects (docs/SCOPE.md §9.10). Everyone sees each
 * project's progress — confirmed giving over its target, computed live — and
 * how much they have given themselves. Apostles create projects here.
 */
export default async function PartnershipsPage() {
  const user = await requireSession();
  const projects = await listProjects(user);
  const manages = can(user, "projects.manage");

  return (
    <>
      <PageHeader
        title="Partnerships"
        description="The church's fundraising projects. Give to one from My giving, or make a pledge."
      />

      <PageGrid
        aside={
          <>
            <Panel title="Across all projects">
              <FactList
                facts={[
                  {
                    label: "Active projects",
                    value: projects.filter((p) => p.status === "ACTIVE").length,
                  },
                  {
                    label: "Raised",
                    value: <Money cents={projects.reduce((sum, p) => sum + p.raisedCents, 0)} />,
                  },
                  {
                    label: "You have given",
                    value: <Money cents={projects.reduce((sum, p) => sum + p.mineCents, 0)} />,
                  },
                ]}
              />
            </Panel>
            <QuickActions
              actions={[
                {
                  href: "/finance",
                  label: "Give to a project",
                  icon: <WalletIcon aria-hidden />,
                  hint: "My giving → Log payment → Partnership",
                },
                {
                  href: "/finance/pledges",
                  label: "Make a pledge",
                  icon: <HandCoinsIcon aria-hidden />,
                  hint: "Promise a total by a date",
                },
              ]}
            />
            {manages && (
              <Panel title="New project">
                <ProjectForm />
              </Panel>
            )}
          </>
        }
      >
        {projects.length === 0 ? (
          <Panel>
            <EmptyState
              icon={<HandCoinsIcon className="size-5" aria-hidden />}
              title="No projects yet"
            />
          </Panel>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => {
              const bar = progress(project.raisedCents, project.targetCents);
              return (
                <li key={project.id}>
                  <Link
                    href={`/partnerships/${project.id}`}
                    className="bg-card border-border hover:border-foreground/25 flex h-full flex-col rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-foreground text-base font-semibold">{project.name}</h2>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                    {project.description && (
                      <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-auto pt-4">
                      <Progress value={bar.real} label={`${project.name} progress`} />
                      <p className="text-muted-foreground mt-2 flex flex-wrap justify-between gap-2 text-xs">
                        <span>
                          <Money
                            cents={project.raisedCents}
                            className="text-foreground font-semibold"
                          />{" "}
                          of <Money cents={project.targetCents} />
                        </span>
                        <span>
                          {project.status === "ACTIVE" && project.daysLeft !== null
                            ? `${project.daysLeft} days left`
                            : project.endDate && project.endDate < harareToday()
                              ? "Ended"
                              : "No end date"}
                        </span>
                      </p>
                      {project.mineCents !== 0 && (
                        <p className="text-primary mt-1 text-xs font-semibold">
                          You have given <Money cents={project.mineCents} />
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PageGrid>
    </>
  );
}
