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

  return (
    <li className="border-foreground/12 grid gap-x-6 gap-y-3 border-t py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="font-heading text-lg leading-snug">
            {member.firstName} {member.lastName}
          </span>
          {member.role === "ADMIN" && (
            <span className="text-accent-foreground font-mono text-[0.6rem] tracking-[0.18em] uppercase">
              Admin
            </span>
          )}
          {isSelf && <span className="text-muted-foreground text-xs">(you)</span>}
        </p>
        <p className="text-muted-foreground mt-1 text-sm break-all">{member.email}</p>
        <p className="text-muted-foreground/80 mt-1 font-mono text-[0.65rem] tracking-wide">
          {status} · joined {joined.format(member.joinedAt)}
        </p>
      </div>

      {/* An admin cannot demote or deactivate themselves — that is the fastest
          route to a church with no administrator and no way back in. */}
      {!isSelf && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
        className={`focus-visible:ring-ring rounded-sm text-xs underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none ${
          destructive ? "text-destructive" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {children}
      </button>
    </form>
  );
}
