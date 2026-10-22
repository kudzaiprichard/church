import {
  ArrowLeftIcon,
  ClipboardCheckIcon,
  DropletsIcon,
  PencilIcon,
  UsersRoundIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { formatRate } from "@/lib/attendance/rules";
import { requireSession } from "@/lib/auth/dal";
import { ROLE_LABELS, can } from "@/lib/auth/permissions";
import { memberAttendance } from "@/lib/data/attendance";
import { memberGiving } from "@/lib/data/finance";
import { getMember } from "@/lib/data/members";
import { memberPledges } from "@/lib/data/partnerships";
import { formatDateOnly } from "@/lib/dates";
import { formatMoney } from "@/lib/finance/money";
import { cn } from "@/lib/utils";

import { EmptyState, FactList, PageGrid, PageHeader, Panel } from "../../_components/page-parts";
import { PersonAvatar } from "../../_components/person-avatar";
import { ChemaGrid, HistoryTable, TypeTotals } from "../../finance/finance-parts";
import { PledgeList } from "../../finance/pledges/pledge-list";
import { ReverseForm } from "../../finance/review/review-forms";
import { MemberControls, memberStatus } from "../member-row";

export const metadata: Metadata = { title: "Member" };

const joined = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Harare",
});

const GENDER = { MALE: "Male", FEMALE: "Female" } as const;

/**
 * One member's record (docs/SCOPE.md §9.3).
 *
 * `getMember` applies the caller's scope inside the query, so somebody outside
 * it — a leader opening a member of another group — is indistinguishable from
 * an id that does not exist, and gets the same 404.
 *
 * Tabs are links (`?tab=`), so each view is its own address and the page stays
 * a Server Component. The Attendance tab appears only for the member, the
 * Apostles and the leaders of a group they are in; Giving and Pledges only for
 * holders of `finance.viewAll` — the data functions return `null` otherwise.
 */
export default async function MemberPage(props: PageProps<"/members/[id]">) {
  const user = await requireSession();
  const { id } = await props.params;
  const { tab } = await props.searchParams;

  const member = await getMember(user, id);
  if (!member) notFound();
  const [attendance, giving, pledges] = await Promise.all([
    memberAttendance(user, member.id),
    memberGiving(user, member.id),
    memberPledges(user, member.id),
  ]);
  const reverses = can(user, "finance.confirm");

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "groups", label: "Groups" },
    ...(attendance ? [{ id: "attendance", label: "Attendance" }] : []),
    ...(giving ? [{ id: "giving", label: "Giving" }] : []),
    ...(pledges ? [{ id: "pledges", label: "Pledges" }] : []),
    ...(member.baptism !== "hidden" ? [{ id: "baptism", label: "Baptism" }] : []),
  ];
  const active = tabs.find((entry) => entry.id === tab)?.id ?? "profile";

  const abilities = {
    enroll: can(user, "members.enroll"),
    edit: can(user, "members.edit"),
    setRole: can(user, "members.setRole"),
    setActive: can(user, "members.setActive"),
  };
  const status = memberStatus(member);
  const isSelf = member.id === user.id;
  const openPledges = pledges?.filter(
    (pledge) => pledge.state === "ACTIVE" || pledge.state === "OVERDUE",
  );

  const aside = (
    <>
      <Panel title="At a glance">
        <FactList
          facts={[
            { label: "Office", value: ROLE_LABELS[member.role] },
            {
              label: "Connect groups",
              value:
                member.groups.length > 0 ? member.groups.map((g) => g.name).join(", ") : "None",
            },
            ...(attendance
              ? [
                  {
                    label: "Attendance, 12 months",
                    value: formatRate(attendance.rate),
                    href: `/members/${member.id}?tab=attendance`,
                  },
                ]
              : []),
            ...(giving
              ? [
                  {
                    label: `Given in ${giving.year}`,
                    value: formatMoney(giving.totals.total),
                    href: `/members/${member.id}?tab=giving`,
                  },
                ]
              : []),
            ...(openPledges
              ? [
                  {
                    label: "Open pledges",
                    value: openPledges.length,
                    href: `/members/${member.id}?tab=pledges`,
                  },
                ]
              : []),
          ]}
        />
      </Panel>
      {!isSelf && (
        <Panel title="Account" description="Takes effect on their next page load.">
          <MemberControls member={member} can={abilities} />
        </Panel>
      )}
    </>
  );

  return (
    <>
      <Link
        href="/members"
        className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        Members
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <PersonAvatar person={member} className="size-11 text-sm" />
            {member.firstName} {member.lastName}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${status.tone}`}>
              {status.label}
            </span>
            <span>Member since {joined.format(new Date(member.joinedAt))}</span>
          </span>
        }
        actions={
          abilities.edit && (
            <Link
              href={`/members/${member.id}/edit`}
              className="border-border bg-card hover:bg-muted inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              <PencilIcon className="size-3.5" aria-hidden />
              Edit
            </Link>
          )
        }
      />

      <PageGrid aside={aside}>
        <div className="min-w-0">
          <nav
            aria-label="Member record"
            className="border-border mb-4 flex gap-1 overflow-x-auto border-b"
          >
            {tabs.map((entry) => (
              <Link
                key={entry.id}
                href={
                  entry.id === "profile"
                    ? `/members/${member.id}`
                    : `/members/${member.id}?tab=${entry.id}`
                }
                aria-current={entry.id === active ? "page" : undefined}
                className={cn(
                  "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                  entry.id === active
                    ? "border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {entry.label}
              </Link>
            ))}
          </nav>

          {active === "profile" && (
            <Panel title="Contact and personal details">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Detail label="Email">{member.email}</Detail>
                <Detail label="Phone">{member.phone}</Detail>
                {member.personal && (
                  <>
                    <Detail label="Date of birth">
                      {member.personal.dateOfBirth && formatDateOnly(member.personal.dateOfBirth)}
                    </Detail>
                    <Detail label="Gender">
                      {member.personal.gender && GENDER[member.personal.gender]}
                    </Detail>
                    <Detail label="Address" wide>
                      {member.personal.address}
                    </Detail>
                  </>
                )}
              </dl>
            </Panel>
          )}

          {active === "groups" && (
            <Panel title="Connect groups" bodyClassName="p-0">
              {member.groups.length === 0 ? (
                <EmptyState
                  icon={<UsersRoundIcon className="size-5" aria-hidden />}
                  title="In no group yet"
                >
                  An Apostle can add them to a group from Edit.
                </EmptyState>
              ) : (
                <ul className="divide-border divide-y">
                  {member.groups.map((group) => (
                    <li key={group.id} className="text-foreground px-5 py-3 text-sm font-medium">
                      {group.name}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {active === "attendance" && attendance && (
            <Panel
              title="Attendance"
              description={`Rate over the last twelve months: ${formatRate(attendance.rate)}`}

              bodyClassName="p-0"
            >
              {attendance.rows.length === 0 ? (
                <EmptyState
                  icon={<ClipboardCheckIcon className="size-5" aria-hidden />}
                  title="Nothing marked yet"
                />
              ) : (
                <ul className="divide-border divide-y">
                  {attendance.rows.map((row) => (
                    <li
                      key={row.eventId}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-foreground text-sm font-semibold">{row.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatDateOnly(row.date)} · {row.group ?? "All Church"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-semibold",
                          row.status === "PRESENT"
                            ? "bg-success/15 text-success"
                            : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {row.status === "PRESENT" ? "Present" : "Absent"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {active === "giving" && giving && (
            <div className="grid gap-4">
              <TypeTotals confirmed={giving.totals.confirmed} pending={giving.totals.pending} />
              <Panel title={`Chema ${giving.year}`}>
                <ChemaGrid cells={giving.grid} />
              </Panel>
              <Panel
                title={`${giving.year} history`}
                description={
                  reverses
                    ? "Confirmed payments are never edited. Correct a mistake with a reversal, which records a negative entry beside it."
                    : undefined
                }
                bodyClassName="p-0"
              >
                {giving.history.length === 0 ? (
                  <EmptyState
                    icon={<ClipboardCheckIcon className="size-5" aria-hidden />}
                    title="Nothing this year"
                  />
                ) : (
                  <HistoryTable
                    rows={giving.history}
                    actions={
                      reverses
                        ? (row) =>
                            row.status === "CONFIRMED" && !row.isReversal && !row.reversed ? (
                              <ReverseForm id={row.id} />
                            ) : null
                        : undefined
                    }
                  />
                )}
              </Panel>
            </div>
          )}

          {active === "pledges" && pledges && (
            <Panel title="Pledges" bodyClassName="p-0">
              {pledges.length === 0 ? (
                <EmptyState
                  icon={<ClipboardCheckIcon className="size-5" aria-hidden />}
                  title="No pledges"
                />
              ) : (
                <PledgeList pledges={pledges} />
              )}
            </Panel>
          )}

          {active === "baptism" && member.baptism !== "hidden" && (
            <Panel title="Baptismal record">
              {member.baptism === null ? (
                <EmptyState
                  icon={<DropletsIcon className="size-5" aria-hidden />}
                  title="No record"
                >
                  This account predates enrolment and has no baptismal record. An Apostle can add
                  one from Edit.
                </EmptyState>
              ) : (
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Detail label="Baptized on">{formatDateOnly(member.baptism.baptismDate)}</Detail>
                  <Detail label="Where">{member.baptism.location}</Detail>
                  <Detail label="Conducted by">{member.baptism.conductedBy}</Detail>
                  <Detail label="Baptismal class completed">
                    {member.baptism.classCompletedOn &&
                      formatDateOnly(member.baptism.classCompletedOn)}
                  </Detail>
                  <Detail label="Notes" wide>
                    {member.baptism.notes}
                  </Detail>
                </dl>
              )}
            </Panel>
          )}
        </div>
      </PageGrid>
    </>
  );
}

function Detail({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-foreground mt-1 text-sm break-words whitespace-pre-line">
        {children || <span className="text-muted-foreground">Not recorded</span>}
      </dd>
    </div>
  );
}
