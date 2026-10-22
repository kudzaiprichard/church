import { cookies } from "next/headers";

import { signOut } from "@/app/(auth)/actions";
import { ledGroupIds, requireSession } from "@/lib/auth/dal";
import { bellPreview } from "@/lib/data/notifications";

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
 * the server and stays scoped: `bellPreview` pins it to the signed-in person —
 * an Apostle included, since a notification is addressed to one person — and
 * filters each link to a same-site path before it reaches an href.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireSession();
  const jar = await cookies();

  const [bell, led] = await Promise.all([bellPreview(user), ledGroupIds(user)]);

  return (
    <AppShell
      user={user}
      rail={railFor(user, led)}
      signOut={signOut}
      notifications={bell.items}
      unreadCount={bell.unreadCount}
      defaultPanelCollapsed={jar.get(PANEL_COOKIE)?.value === "1"}
    >
      {children}
    </AppShell>
  );
}
