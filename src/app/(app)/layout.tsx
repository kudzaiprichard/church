import { cookies } from "next/headers";

import { signOut } from "@/app/(auth)/actions";
import { ledGroupIds, requireSession } from "@/lib/auth/dal";
import { pendingCount } from "@/lib/data/finance";
import { unreadMessageCount } from "@/lib/data/messages";
import { bellPreview } from "@/lib/data/notifications";
import { mayCompose } from "@/lib/messages/rules";

import { AppShell } from "./_components/app-shell";
import { PANEL_COOKIE, createActionsFor, railFor } from "./_components/nav";

/**
 * The member area.
 *
 * The guard here is for the chrome — it decides which pages the sidebar
 * shows, what the "New" menu offers, and gives the top bar a name to put in
 * the corner. It is deliberately not the only check. A layout does not
 * re-render on every navigation inside its segment, and a Server Action can
 * reach data without rendering a layout at all, so every page and every
 * action underneath calls the Data Access Layer again. That is where the
 * decision that matters is made.
 *
 * Notifications and the sidebar's counts are read here rather than in the
 * client so the queries stay on the server and stay scoped: each is pinned to
 * the signed-in person (or, for payments to review, needs `finance.confirm`).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireSession();
  const jar = await cookies();

  const [bell, led, unreadMessages, toReview] = await Promise.all([
    bellPreview(user),
    ledGroupIds(user),
    unreadMessageCount(user),
    pendingCount(user),
  ]);

  return (
    <AppShell
      user={user}
      rail={railFor(user, led)}
      badges={{ "/messages": unreadMessages, "/finance/review": toReview }}
      createActions={createActionsFor(user, led, mayCompose(user, led))}
      signOut={signOut}
      notifications={bell.items}
      unreadCount={bell.unreadCount}
      defaultPanelCollapsed={jar.get(PANEL_COOKIE)?.value === "1"}
    >
      {children}
    </AppShell>
  );
}
