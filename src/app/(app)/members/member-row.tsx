import type { Role } from "@/generated/prisma/enums";

import { resendInvitation, sendPasswordReset, setActive, setRole } from "./actions";

const joined = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

type Member = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  joinedAt: Date;
  lastLoginAt: Date | null;
  activated: boolean;
};

/**
 * One person on the roll, with the three things an admin can do to them.
 *
 * Each control is a form posting to a Server Action rather than a link, because
 * every one of them changes something — and because the action re-checks that
 * the caller is an admin regardless of what this row renders.
 */
export function MemberRow({ member, isSelf }: { member: Member; isSelf: boolean }) {
  const status = !member.isActive
    ? "Deactivated"
    : !member.activated
      ? "Invitation pending"
      : member.lastLoginAt
        ? `Last signed in ${joined.format(member.lastLoginAt)}`
        : "Never signed in";

  const initials = `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();
  const tone = !member.isActive
    ? "bg-destructive/10 text-destructive"
    : !member.activated
      ? "bg-accent text-accent-foreground"
      : "bg-success/10 text-success";

  return (
    <li className="grid gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold ${
            member.isActive ? "bg-secondary text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {initials}
        </span>

        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-foreground text-sm font-semibold">
              {member.firstName} {member.lastName}
            </span>
            {member.role === "ADMIN" && (
              <span className="bg-secondary text-primary rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold">
                Admin
              </span>
            )}
            {isSelf && <span className="text-muted-foreground text-xs">(you)</span>}
          </p>
          <p className="text-muted-foreground mt-0.5 text-sm break-all">{member.email}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-md px-1.5 py-0.5 font-medium ${tone}`}>{status}</span>
            <span className="text-muted-foreground">Joined {joined.format(member.joinedAt)}</span>
          </p>
        </div>
      </div>

      {/* An admin cannot demote or deactivate themselves — that is the fastest
          route to a church with no administrator and no way back in. */}
      {!isSelf && (
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          {!member.activated && member.isActive && (
            <RowAction action={resendInvitation.bind(null, member.id)}>Resend invitation</RowAction>
          )}

          {member.activated && member.isActive && (
            <RowAction action={sendPasswordReset.bind(null, member.id)}>Send password reset</RowAction>
          )}

          <RowAction
            action={setRole.bind(null, member.id, member.role === "ADMIN" ? "MEMBER" : "ADMIN")}
          >
            {member.role === "ADMIN" ? "Make a member" : "Make an admin"}
          </RowAction>

          <RowAction action={setActive.bind(null, member.id, !member.isActive)} destructive>
            {member.isActive ? "Deactivate" : "Reactivate"}
          </RowAction>
        </div>
      )}
    </li>
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
    </form>
  );
}
