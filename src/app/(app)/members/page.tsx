import { SearchIcon, UserPlusIcon, UsersIcon } from "lucide-react";
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

import { EmptyState, PageHeader, Panel } from "../_components/page-parts";
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
    page: Number(one("page")) || 1,
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
  const [result, groups, pending] = await Promise.all([
    listMembers(user, filters),
    groupOptions(),
    countPendingInvitations(user),
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
        eyebrow="People"
        title="Members"
        description={
          <>
            {wholeRoll
              ? "Everyone on the roll. There is no public sign-up — people join by being enrolled."
              : "The members of the groups you lead."}
            {pending > 0 &&
              ` ${pending} ${pending === 1 ? "invitation has" : "invitations have"} not been accepted yet.`}
          </>
        }
        actions={
          abilities.enroll && (
            <Link
              href="/members/new"
              className="action-solid inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <UserPlusIcon className="size-4" aria-hidden />
              Enrol a member
            </Link>
          )
        }
      />

      <form
        method="get"
        role="search"
        aria-label="Filter members"
        className="bg-card border-border mb-4 grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end"
      >
        <FilterField label="Search" htmlFor="q">
          <div className="relative">
            <SearchIcon
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder="Name, email or phone"
              className={`${filterControl} pl-9`}
            />
          </div>
        </FilterField>
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
          <select id="role" name="role" defaultValue={filters.role ?? ""} className={filterControl}>
            <option value="">Any office</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Status" htmlFor="status">
          <select id="status" name="status" defaultValue={filters.status} className={filterControl}>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
            <option value="all">Everyone</option>
          </select>
        </FilterField>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <button
            type="submit"
            className="action-solid h-10 flex-1 cursor-pointer rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none lg:flex-none"
          >
            Filter
          </button>
          {filtered && (
            <Link
              href="/members"
              className="border-border hover:bg-muted inline-flex h-10 items-center rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      <Panel
        title={`${result.total} ${result.total === 1 ? "person" : "people"}`}
        description="By surname."
        bodyClassName="p-0"
      >
        {result.rows.length === 0 ? (
          <EmptyState icon={<UsersIcon className="size-5" aria-hidden />} title="Nobody matches">
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
            <div className="border-border border-t">
              <Pagination
                page={result.page}
                pageCount={result.pageCount}
                total={result.total}
                pathname="/members"
                params={{
                  q: filters.q,
                  group: filters.groupId,
                  role: filters.role,
                  status: filters.status === "active" ? undefined : filters.status,
                }}
              />
            </div>
          </>
        )}
      </Panel>
    </>
  );
}

const filterControl =
  "border-input bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]";

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
      <label htmlFor={htmlFor} className="text-foreground text-xs font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}
