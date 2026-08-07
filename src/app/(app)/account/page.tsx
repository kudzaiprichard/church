import type { Metadata } from "next";
import Link from "next/link";

import { requireSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Account" };

const stamp = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AccountPage() {
  const user = await requireSession();

  // Scoped to the signed-in user by construction, not by a filter that could be
  // forgotten — there is no id here to get wrong.
  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, userAgent: true, lastSeenAt: true, createdAt: true },
  });

  return (
    <>
      <h1 className="text-3xl leading-tight">Your account</h1>

      <dl className="mt-9 grid max-w-lg gap-5 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.2em] uppercase">
            Name
          </dt>
          <dd className="mt-2 text-sm">
            {user.firstName} {user.lastName}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.2em] uppercase">
            Email
          </dt>
          <dd className="mt-2 text-sm break-all">{user.email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.2em] uppercase">
            Role
          </dt>
          <dd className="mt-2 text-sm">
            {user.role === "ADMIN" ? "Administrator" : "Member"}
          </dd>
        </div>
      </dl>

      <div className="border-foreground/15 mt-10 border-t pt-6">
        <Link
          href="/change-password"
          className="focus-visible:ring-ring decoration-accent-foreground rounded-sm text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          Change your password
        </Link>
      </div>

      <div className="mt-12">
        <h2 className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.2em] uppercase">
          Where you are signed in
        </h2>
        <p className="text-muted-foreground mt-3 max-w-lg text-sm text-pretty">
          Changing your password signs out every browser except the one you change it in.
        </p>

        <ul className="mt-5 max-w-lg">
          {sessions.map((session) => (
            <li key={session.id} className="border-foreground/12 border-t py-4">
              <p className="text-sm break-words">{session.userAgent ?? "Unknown browser"}</p>
              <p className="text-muted-foreground/80 mt-1 font-mono text-[0.65rem] tracking-wide">
                Last used {stamp.format(session.lastSeenAt)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
