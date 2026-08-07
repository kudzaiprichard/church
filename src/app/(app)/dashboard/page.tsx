import type { Metadata } from "next";

import { ownerScope, requireSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The landing spot after sign-in, and the first worked example of the Key
 * System Rule: the same query serves both tiers, and `ownerScope` is what
 * decides whether it counts the whole church or one person.
 */
export default async function DashboardPage() {
  const user = await requireSession();
  const isAdmin = user.role === "ADMIN";

  const [contributions, attendance, unreadMessages] = await Promise.all([
    prisma.contribution.count({ where: ownerScope(user) }),
    prisma.attendanceRecord.count({ where: ownerScope(user) }),
    prisma.messageRecipient.count({ where: { ...ownerScope(user), readAt: null } }),
  ]);

  const figures = [
    { label: isAdmin ? "Contributions recorded" : "Your contributions", value: contributions },
    { label: isAdmin ? "Attendance records" : "Services you attended", value: attendance },
    { label: "Unread messages", value: unreadMessages },
  ];

  return (
    <>
      <h1 className="text-3xl leading-tight">Good to see you, {user.firstName}.</h1>
      <p className="text-muted-foreground mt-3 max-w-xl text-pretty">
        {isAdmin
          ? "You are signed in as an administrator, so these figures cover the whole congregation."
          : "These are your own records. Nobody else's data is visible here, and yours is visible only to you and the church office."}
      </p>

      <dl className="mt-10 grid gap-x-10 sm:grid-cols-3">
        {figures.map((figure) => (
          <div key={figure.label} className="border-foreground/15 border-t py-6">
            <dt className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.2em] uppercase">
              {figure.label}
            </dt>
            <dd className="numeric mt-3 text-4xl leading-none">{figure.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-muted-foreground mt-10 text-sm">
        The remaining modules — messages, groups, events, giving, sermons — are not built yet.
      </p>
    </>
  );
}
