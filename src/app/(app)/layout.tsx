import { cookies } from "next/headers";

import { signOut } from "@/app/(auth)/actions";
import { ownerScope, requireSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

import { AppShell } from "./_components/app-shell";
import { PANEL_COOKIE, railFor } from "./_components/nav";

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
 * the server and stays scoped: `ownerScope` pins it to the signed-in person,
 * and only the fields the popover draws are handed to the client.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireSession();
  const jar = await cookies();

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: ownerScope(user),
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, title: true, body: true, linkUrl: true, createdAt: true, readAt: true },
    }),
    prisma.notification.count({ where: { ...ownerScope(user), readAt: null } }),
  ]);

  return (
    <AppShell
      user={user}
      rail={railFor(user.role)}
      signOut={signOut}
      notifications={notifications.map(({ readAt, createdAt, ...rest }) => ({
        ...rest,
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
