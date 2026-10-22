import { HandCoinsIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requireSession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { listProjects } from "@/lib/data/partnerships";
import { harareToday } from "@/lib/dates";
import { progress } from "@/lib/finance/pledges";

import { Money } from "../_components/money";
import { EmptyState, PageHeader, Panel } from "../_components/page-parts";
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
        eyebrow="Records"
        title="Partnerships"
        description="The church's fundraising projects. Give to one from My giving, or make a pledge."
      />

      {projects.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<HandCoinsIcon className="size-5" aria-hidden />}
            title="No projects yet"
          />
        </Panel>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const bar = progress(project.raisedCents, project.targetCents);
            return (
              <li key={project.id}>
                <Link
                  href={`/partnerships/${project.id}`}
                  className="bg-card border-border hover:border-primary/40 flex h-full flex-col rounded-xl border p-5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-foreground text-base font-bold">{project.name}</h2>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  {project.description && (
                    <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{project.description}</p>
                  )}
                  <div className="mt-auto pt-4">
                    <Progress value={bar.real} label={`${project.name} progress`} />
                    <p className="text-muted-foreground mt-2 flex flex-wrap justify-between gap-2 text-xs">
                      <span>
                        <Money cents={project.raisedCents} className="text-foreground font-semibold" /> of{" "}
                        <Money cents={project.targetCents} />
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

      {manages && (
        <Panel title="New project" className="mt-6 max-w-3xl">
          <ProjectForm />
        </Panel>
      )}
    </>
  );
}
