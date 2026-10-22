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
import { getMember } from "@/lib/data/members";
import { formatDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { EmptyState, PageHeader, Panel } from "../../_components/page-parts";
import { MemberControls, initialsOf, memberStatus } from "../member-row";

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
 * Apostles and the leaders of a group they are in. Giving and Pledges join in
 * Phase 3.
 */
export default async function MemberPage(props: PageProps<"/members/[id]">) {
  const user = await requireSession();
  const { id } = await props.params;
  const { tab } = await props.searchParams;

  const member = await getMember(user, id);
  if (!member) notFound();
  const attendance = await memberAttendance(user, member.id);

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "groups", label: "Groups" },
    ...(attendance ? [{ id: "attendance", label: "Attendance" }] : []),
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
        eyebrow={ROLE_LABELS[member.role]}
        title={
          <span className="flex items-center gap-3">
            <span
              aria-hidden
              className="bg-secondary text-primary grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold"
            >
              {initialsOf(member)}
            </span>
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
              className="border-border bg-card hover:bg-muted inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              <PencilIcon className="size-3.5" aria-hidden />
              Edit
            </Link>
          )
        }
      />

      {!isSelf && <MemberControls member={member} can={abilities} className="mb-5" />}

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
        <Panel title="Contact and personal details" className="max-w-3xl">
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
        <Panel title="Connect groups" className="max-w-3xl" bodyClassName="p-0">
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
          className="max-w-3xl"
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

      {active === "baptism" && member.baptism !== "hidden" && (
        <Panel title="Baptismal record" className="max-w-3xl">
          {member.baptism === null ? (
            <EmptyState icon={<DropletsIcon className="size-5" aria-hidden />} title="No record">
              This account predates enrolment and has no baptismal record. An Apostle can add one
              from Edit.
            </EmptyState>
          ) : (
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Baptized on">{formatDateOnly(member.baptism.baptismDate)}</Detail>
              <Detail label="Where">{member.baptism.location}</Detail>
              <Detail label="Conducted by">{member.baptism.conductedBy}</Detail>
              <Detail label="Baptismal class completed">
                {member.baptism.classCompletedOn && formatDateOnly(member.baptism.classCompletedOn)}
              </Detail>
              <Detail label="Notes" wide>
                {member.baptism.notes}
              </Detail>
            </dl>
          )}
        </Panel>
      )}
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
