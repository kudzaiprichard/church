import type { Metadata } from "next";
import { KeyRoundIcon, MonitorSmartphoneIcon } from "lucide-react";
import Link from "next/link";

import { requireSession } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import { PageHeader, Panel } from "../_components/page-parts";

export const metadata: Metadata = { title: "Account" };

const stamp = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * "Chrome on Windows" from a user-agent string. Order matters: Edge and Opera
 * both claim to be Chrome, and Chrome claims to be Safari, so the more
 * specific names are tested first. Anything unrecognised falls back to a
 * plain description rather than the raw string.
 */
function describeDevice(userAgent: string | null) {
  if (!userAgent) return "Unknown browser";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "A browser";
  const system = /iPhone|iPad/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS X/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null;
  return system ? `${browser} on ${system}` : browser;
}

export default async function AccountPage() {
  const user = await requireSession();

  // Scoped to the signed-in user by construction, not by a filter that could be
  // forgotten — there is no id here to get wrong.
  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, userAgent: true, lastSeenAt: true, createdAt: true },
  });

  const details = [
    { label: "Name", value: `${user.firstName} ${user.lastName}` },
    { label: "Email", value: user.email },
    { label: "Office", value: ROLE_LABELS[user.role] },
  ];

  return (
    <>
      <PageHeader eyebrow="You" title="Your account" />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4">
          <Panel title="Details">
            <dl className="grid gap-5 sm:grid-cols-3">
              {details.map((detail) => (
                <div key={detail.label} className="min-w-0">
                  <dt className="text-muted-foreground text-xs font-medium">{detail.label}</dt>
                  <dd className="text-foreground mt-1 text-sm font-semibold break-all">
                    {detail.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel
            title="Where you are signed in"
            description="Changing your password signs out every browser except the one you change it in."
            bodyClassName="p-0"
          >
            <ul className="divide-border divide-y">
              {sessions.map((session) => (
                <li key={session.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="bg-secondary text-primary grid size-9 shrink-0 place-items-center rounded-lg">
                    <MonitorSmartphoneIcon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p
                      className="text-foreground text-sm font-semibold"
                      title={session.userAgent ?? undefined}
                    >
                      {describeDevice(session.userAgent)}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Last used {stamp.format(session.lastSeenAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel title="Password" description="Choose a new one at any time.">
          <Link
            href="/change-password"
            className="action-solid inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <KeyRoundIcon className="size-4" aria-hidden />
            Change your password
          </Link>
        </Panel>
      </div>
    </>
  );
}
