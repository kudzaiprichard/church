import { cookies } from "next/headers";

import { signOut } from "@/app/(auth)/actions";
import { requireSession, selfScope } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

import { AppShell } from "./_components/app-shell";
import { PANEL_COOKIE, railFor } from "./_components/nav";

/**
 * Reduce a stored URL to a same-site path, or nothing.
 *
 * A single leading slash only: no scheme, and none of the protocol-relative
 * disguises (`//host`, `/\host`, `javascript:`), since a browser will happily
 * follow all of them out of the application.
 */
function safeInternalPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\") || value.includes("://")) return null;
  return value;
}

/**
 * The member area.
 *
 * The guard here is for the chrome — it decides which sections the rail shows
 * and gives the top bar a name to put in the corner. It is deliberately not
 * the only check. A layout does not re-render on every navigation inside its
 * segment, and a Server Action can reach data without rendering a layout at
 * all, so every page and every action underneath calls the Data Access Layer
 * again. That is where the decision that matters is made.
 *
 * Notifications are read here rather than in the bell so the query stays on
 * the server and stays scoped: `selfScope` pins it to the signed-in person —
 * an Apostle included, since a notification is addressed to one person —
 * and only the fields the popover draws are handed to the client.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireSession();
  const jar = await cookies();

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: selfScope(user),
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, title: true, body: true, linkUrl: true, createdAt: true, readAt: true },
    }),
    prisma.notification.count({ where: { ...selfScope(user), readAt: null } }),
  ]);

  return (
    <AppShell
      user={user}
      rail={railFor(user)}
      signOut={signOut}
      notifications={notifications.map(({ readAt, createdAt, linkUrl, ...rest }) => ({
        ...rest,
        // `linkUrl` is written by other modules and ends up in an anchor's
        // href, which is one of the few places a string becomes executable —
        // `javascript:` and `data:` URLs both run there. Only a plain path on
        // this site survives; anything else is dropped and the notification
        // falls back to the inbox.
        linkUrl: safeInternalPath(linkUrl),
        createdAt: createdAt.toISOString(),
        read: readAt !== null,
      }))}
      unreadCount={unreadCount}
      defaultPanelCollapsed={jar.get(PANEL_COOKIE)?.value === "1"}
    >
      {children}
    </AppShell>
  );
}
