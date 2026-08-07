import { cookies } from "next/headers";

import { signOut } from "@/app/(auth)/actions";
import { requireSession } from "@/lib/auth/dal";

import { AppShell } from "./_components/app-shell";
import { SIDEBAR_COOKIE, navFor } from "./_components/nav";

/**
 * The member area.
 *
 * The guard here is for the chrome — it decides which sections the sidebar
 * shows and gives the top bar a name to put in the corner. It is deliberately
 * not the only check. A layout does not re-render on every navigation inside
 * its segment, and a Server Action can reach data without rendering a layout
 * at all, so every page and every action underneath calls the Data Access
 * Layer again. That is where the decision that matters is made.
 *
 * The sidebar's collapsed state is read from a cookie here so the first paint
 * is already the right width. `children` is handed to the client shell as a
 * prop, which keeps every page inside it server-rendered.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireSession();
  const jar = await cookies();

  return (
    <AppShell
      user={user}
      sections={navFor(user.role)}
      signOut={signOut}
      defaultCollapsed={jar.get(SIDEBAR_COOKIE)?.value === "1"}
    >
      {children}
    </AppShell>
  );
}
