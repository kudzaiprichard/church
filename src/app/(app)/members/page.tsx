import { CakeIcon, SearchIcon, UploadIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import type { Role } from "@/generated/prisma/enums";
import { ledGroupIds, requireSession } from "@/lib/auth/dal";
import { ROLES, ROLE_LABELS, can } from "@/lib/auth/permissions";
import {
  countPendingInvitations,
  groupOptions,
  listMembers,
  type MemberFilters,
} from "@/lib/data/members";
import { listGroups } from "@/lib/data/groups";
import { parsePaging } from "@/lib/paging";

import {
  EmptyState,
  FactList,
  PageGrid,
  PageHeader,
  Panel,
  QuickActions,
} from "../_components/page-parts";
import { Pagination } from "../_components/pagination";

import { MemberRow } from "./member-row";

export const metadata: Metadata = { title: "Members" };

const STATUSES = ["active", "inactive", "all"] as const;

/** Read the filters out of the URL, dropping anything that is not a real value. */
function filtersFrom(params: Record<string, string | string[] | undefined>): MemberFilters {
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  };
  const role = one("role");
  const status = one("status");

  return {
    q: one("q")?.slice(0, 100),
    groupId: one("group"),
    role: ROLES.includes(role as Role) ? (role as Role) : undefined,
    status: STATUSES.includes(status as (typeof STATUSES)[number])
      ? (status as (typeof STATUSES)[number])
      : "active",
    ...parsePaging(params, 20),
  };
}

/**
 * The member directory (docs/SCOPE.md §9.3).
 *
 * Who sees whom is decided by `memberScope` inside `listMembers`: Apostles and
 * the Matron see the whole roll, a group leader sees the members of the groups
 * they lead. Anyone with none of those is sent to their dashboard before a row
 * is read. Filters live in the URL so a filtered list survives a reload and
 * can be shared.
 */
export default async function MembersPage(props: PageProps<"/members">) {
  const user = await requireSession();
  const leads = (await ledGroupIds(user)).length > 0;

  if (!can(user, "members.viewAll") && !can(user, "members.enroll") && !leads) {
    redirect("/dashboard");
  }

  const filters = filtersFrom(await props.searchParams);
  const [result, groups, pending, groupCounts] = await Promise.all([
    listMembers(user, filters),
    groupOptions(),
    countPendingInvitations(user),
    listGroups(user),
  ]);

  const abilities = {
    enroll: can(user, "members.enroll"),
    edit: can(user, "members.edit"),
    setRole: can(user, "members.setRole"),
    setActive: can(user, "members.setActive"),
  };
  const wholeRoll = can(user, "members.viewAll") || can(user, "baptism.manage");
  const filtered = Boolean(
    filters.q || filters.groupId || filters.role || filters.status !== "active",
  );

  return (
    <>
      <PageHeader
        title="Members"
        description={
          wholeRoll
            ? "Everyone on the roll. There is no public sign-up — people join by being enrolled."
            : "The members of the groups you lead."
        }
        actions={
          abilities.enroll && (
            <>
              <Link
                href="/members/import"
                className="border-border bg-card hover:bg-muted inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              >
                <UploadIcon className="size-4" aria-hidden />
                Import
              </Link>
              <Link
                href="/members/new"
                className="action-solid inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <UserPlusIcon className="size-4" aria-hidden />
                Enrol a member
              </Link>
            </>
          )
        }
      />

      <PageGrid
        aside={
          <>
            <Panel title="The roll">
              <FactList
                facts={[
                  { label: filtered ? "Matching the filters" : "Listed here", value: result.total },
                  { label: "Invitations not yet accepted", value: pending },
                  ...(wholeRoll ? [{ label: "Connect groups", value: groupCounts.length }] : []),
                ]}
              />
            </Panel>

            {groupCounts.length > 0 && (
              <Panel title="By connect group" bodyClassName="p-1.5">
                <ul className="grid gap-px">
                  {groupCounts.map((group) => (
                    <li key={group.id}>
                      <Link
                        href={`/members?group=${group.id}`}
                        aria-current={filters.groupId === group.id ? "true" : undefined}
                        className="hover:bg-muted aria-[current]:bg-secondary flex items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                      >
                        <span className="text-foreground min-w-0 truncate">{group.name}</span>
                        <span className="numeric text-muted-foreground shrink-0 text-xs">
                          {group.memberCount}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <QuickActions
              actions={[
                ...(abilities.enroll
                  ? [
                      {
                        href: "/members/new",
                        label: "Enrol a member",
                        icon: <UserPlusIcon aria-hidden />,
                        hint: "Baptized members only",
                      },
                      {
                        href: "/members/import",
                        label: "Import a member list",
                        icon: <UploadIcon aria-hidden />,
                        hint: "From Excel or CSV",
                      },
                    ]
                  : []),
                {
                  href: "/birthdays",
                  label: "Birthdays",
                  icon: <CakeIcon aria-hidden />,
                  hint: "Who to celebrate this week",
                },
              ]}
            />
          </>
        }
      >
        <section className="bg-card border-border overflow-hidden rounded-lg border">
          <form
            method="get"
            role="search"
            aria-label="Filter members"
            className="border-border grid gap-2 border-b p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]"
          >
            <div className="relative sm:col-span-2 lg:col-span-1">
              <label htmlFor="q" className="sr-only">
                Search
              </label>
              <SearchIcon
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={filters.q}
                placeholder="Search by name, email or phone"
                className={`${filterControl} pl-9`}
              />
            </div>
            <FilterField label="Group" htmlFor="group">
              <select
                id="group"
                name="group"
                defaultValue={filters.groupId ?? ""}
                className={filterControl}
              >
                <option value="">All groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Office" htmlFor="role">
              <select
                id="role"
                name="role"
                defaultValue={filters.role ?? ""}
                className={filterControl}
              >
                <option value="">Any office</option>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Status" htmlFor="status">
              <select
                id="status"
                name="status"
                defaultValue={filters.status}
                className={filterControl}
              >
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
                <option value="all">Everyone</option>
              </select>
            </FilterField>
            <div className="flex gap-2">
              <button
                type="submit"
                className="action-solid h-9 flex-1 cursor-pointer rounded-md px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none lg:flex-none"
              >
                Apply
              </button>
              {filtered && (
                <Link
                  href="/members"
                  className="border-border hover:bg-muted inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>

          <div className="text-muted-foreground border-border hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-x-4 border-b px-4 py-2 text-xs font-medium md:grid">
            <span>{`${result.total} ${result.total === 1 ? "person" : "people"}, by surname`}</span>
            <span>Connect groups</span>
            <span className="pr-6 text-right">Account</span>
          </div>

          {result.rows.length === 0 ? (
            <EmptyState icon={<UsersIcon aria-hidden />} title="Nobody matches">
              {filtered
                ? "Try a different search, or clear the filters."
                : "Nobody is in these groups yet."}
            </EmptyState>
          ) : (
            <>
              <ul className="divide-border divide-y">
                {result.rows.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isSelf={member.id === user.id}
                    can={abilities}
                  />
                ))}
              </ul>
              <Pagination
                  page={result.page}
                  pageCount={result.pageCount}
                  size={result.size}
                  total={result.total}
                  pathname="/members"
                  params={{
                    q: filters.q,
                    group: filters.groupId,
                    role: filters.role,
                    status: filters.status === "active" ? undefined : filters.status,
                  }}
                />
            </>
          )}
        </section>
      </PageGrid>
    </>
  );
}

const filterControl =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]";

function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="sr-only">
        {label}
      </label>
      {children}
    </div>
  );
}
