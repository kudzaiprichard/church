import { PlusIcon, UsersRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requireSession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { listGroups } from "@/lib/data/groups";

import { EmptyState, PageHeader } from "../_components/page-parts";

export const metadata: Metadata = { title: "Connect groups" };

/**
 * The connect groups (docs/SCOPE.md §9.4).
 *
 * An Apostle sees all seven with their leaders and sizes; everyone else sees
 * the groups they belong to or lead. Which ones is decided by `listGroups`.
 */
export default async function GroupsPage() {
  const user = await requireSession();
  const groups = await listGroups(user);
  const manages = can(user, "groups.manage");

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Connect groups"
        description={
          manages
            ? "Every group, its leader and how many active members it has."
            : "The groups you belong to. Fellow members appear by name; contact details stay with the group's leader."
        }
        actions={
          manages && (
            <Link
              href="/groups/new"
              className="action-solid inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <PlusIcon className="size-4" aria-hidden />
              New group
            </Link>
          )
        }
      />

      {groups.length === 0 ? (
        <div className="bg-card border-border rounded-lg border">
          <EmptyState
            icon={<UsersRoundIcon className="size-5" aria-hidden />}
            title={manages ? "No groups yet" : "You are not in a group yet"}
          >
            {manages
              ? "Create the first one."
              : "An Apostle adds members to their connect groups. Speak to the church office."}
          </EmptyState>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="bg-card border-border hover:border-primary/40 flex h-full flex-col rounded-lg border p-5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-foreground text-base font-bold">{group.name}</h2>
                    {group.relation !== "none" && (
                      <span className="bg-secondary text-primary shrink-0 rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold">
                        {group.relation === "leader" ? "You lead" : "Member"}
                      </span>
                    )}
                  </div>
                  {group.audience && (
                    <p className="text-muted-foreground mt-0.5 text-xs">{group.audience}</p>
                  )}
                  {group.description && (
                    <p className="text-muted-foreground mt-3 line-clamp-3 text-sm leading-relaxed">
                      {group.description}
                    </p>
                  )}
                </div>
                <dl className="border-border mt-4 flex items-center justify-between gap-3 border-t pt-3 text-xs">
                  <div>
                    <dt className="sr-only">Leader</dt>
                    <dd
                      className={
                        group.leader ? "text-foreground font-medium" : "text-muted-foreground italic"
                      }
                    >
                      {group.leader ? group.leader.name : "Vacant"}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Members</dt>
                    <dd className="text-muted-foreground numeric">
                      {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
