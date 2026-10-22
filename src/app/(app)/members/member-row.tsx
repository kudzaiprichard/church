import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { ROLES, ROLE_LABELS } from "@/lib/auth/permissions";
import type { MemberListRow } from "@/lib/data/members";

import { PersonAvatar } from "../_components/person-avatar";

import { resendInvitation, sendPasswordReset, setActive, setRole } from "./actions";

const joined = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Harare",
});

/** Which row controls the viewer's office allows. Presentation only. */
export type RowAbilities = {
  enroll: boolean;
  edit: boolean;
  setRole: boolean;
  setActive: boolean;
};

type ControlledMember = Pick<
  MemberListRow,
  "id" | "firstName" | "lastName" | "role" | "isActive" | "activated" | "lastLoginAt"
>;

/** Where an account stands, in a word or three, with its colour. */
export function memberStatus(member: ControlledMember) {
  if (!member.isActive) return { label: "Deactivated", tone: "bg-destructive/10 text-destructive" };
  if (!member.activated) return { label: "Invited", tone: "bg-accent text-accent-foreground" };
  return {
    label: member.lastLoginAt
      ? `Active ${joined.format(new Date(member.lastLoginAt))}`
      : "Never signed in",
    tone: "bg-success/10 text-success",
  };
}

/**
 * One person in the directory: who they are, their groups and where their
 * account stands — and, when it is pending, the one thing to do about it.
 *
 * Changing an office or deactivating someone happens on their own page, not
 * from a long list: those are rare, consequential acts, and four buttons on
 * every row made the roll hard to read and easy to misclick.
 */
export function MemberRow({
  member,
  isSelf,
  can,
}: {
  member: MemberListRow;
  isSelf: boolean;
  can: RowAbilities;
}) {
  const status = memberStatus(member);
  const href = `/members/${member.id}`;

  return (
    <li className="group hover:bg-muted/50 relative grid gap-x-4 gap-y-2 px-4 py-3 transition-colors md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <PersonAvatar person={member} muted={!member.isActive} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {/* The name is the row's link; its hit area is stretched over the row. */}
            <Link
              href={href}
              className="text-foreground rounded-sm text-sm font-semibold after:absolute after:inset-0 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              {member.firstName} {member.lastName}
            </Link>
            {member.role !== "MEMBER" && (
              <span className="bg-secondary text-primary rounded px-1.5 py-px text-[0.65rem] font-semibold">
                {ROLE_LABELS[member.role]}
              </span>
            )}
            {isSelf && <span className="text-muted-foreground text-xs">(you)</span>}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {member.email}
            {member.phone && <span className="numeric"> · {member.phone}</span>}
          </p>
        </div>
      </div>

      <p className="text-muted-foreground min-w-0 truncate pl-12 text-xs md:pl-0">
        {member.groups.length > 0 ? (
          member.groups.map((group) => group.name).join(", ")
        ) : (
          <span className="italic">No connect group</span>
        )}
      </p>

      <div className="relative flex items-center gap-2 pl-12 md:justify-end md:pl-0">
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${status.tone}`}
        >
          {status.label}
        </span>
        {can.enroll && !member.activated && member.isActive && !isSelf && (
          <RowAction action={resendInvitation.bind(null, member.id)}>Resend</RowAction>
        )}
        <ChevronRightIcon
          className="text-muted-foreground hidden size-4 shrink-0 md:block"
          aria-hidden
        />
      </div>
    </li>
  );
}

/**
 * The account controls, shared by the directory row and the member's page.
 *
 * Each is a form posting to a Server Action rather than a link, because every
 * one of them changes something — and each action re-checks the caller's
 * permission regardless of what is rendered here.
 */
export function MemberControls({
  member,
  can,
  className,
}: {
  member: ControlledMember;
  can: RowAbilities;
  className?: string;
}) {
  const any =
    (can.enroll && !member.activated && member.isActive) ||
    (can.edit && member.activated && member.isActive) ||
    can.setRole ||
    can.setActive;
  if (!any) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      {can.enroll && !member.activated && member.isActive && (
        <RowAction action={resendInvitation.bind(null, member.id)}>Resend invitation</RowAction>
      )}

      {can.edit && member.activated && member.isActive && (
        <RowAction action={sendPasswordReset.bind(null, member.id)}>Send password reset</RowAction>
      )}

      {can.setRole && (
        <form action={setRole.bind(null, member.id)} className="flex items-center gap-1">
          <label htmlFor={`role-${member.id}`} className="sr-only">
            Office for {member.firstName} {member.lastName}
          </label>
          <select
            id={`role-${member.id}`}
            name="role"
            defaultValue={member.role}
            className="border-border bg-background focus-visible:ring-ring h-7 rounded-md border px-1.5 text-xs focus-visible:ring-2 focus-visible:outline-none"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <RowButton>Set office</RowButton>
        </form>
      )}

      {can.setActive && (
        <RowAction action={setActive.bind(null, member.id, !member.isActive)} destructive>
          {member.isActive ? "Deactivate" : "Reactivate"}
        </RowAction>
      )}
    </div>
  );
}

function RowAction({
  action,
  children,
  destructive,
}: {
  action: () => Promise<void>;
  children: string;
  destructive?: boolean;
}) {
  return (
    <form action={action}>
      <RowButton destructive={destructive}>{children}</RowButton>
    </form>
  );
}

function RowButton({ children, destructive }: { children: string; destructive?: boolean }) {
  return (
    <button
      type="submit"
      className={`focus-visible:ring-ring h-7 cursor-pointer rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
        destructive
          ? "border-destructive/25 text-destructive hover:bg-destructive/10"
          : "border-border text-foreground/80 hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
