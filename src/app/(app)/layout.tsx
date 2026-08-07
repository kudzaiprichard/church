import { signOut } from "@/app/(auth)/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireSession } from "@/lib/auth/dal";

import { Breadcrumbs } from "./_components/breadcrumbs";
import { MobileNav } from "./_components/mobile-nav";
import { navFor } from "./_components/nav";
import { SidebarNav } from "./_components/sidebar-nav";
import { UserMenu } from "./_components/user-menu";
import { WordMark } from "./_components/word-mark";

/**
 * The shell every internal page sits in: a fixed sidebar on the left, a slim
 * bar across the top carrying the breadcrumb trail and the account menu, and
 * the page itself on a comfortable measure below.
 *
 * The guard here is for the chrome — it decides which sections the sidebar
 * shows and gives the bar a name to put in the corner. It is deliberately not
 * the only check. A layout does not re-render on every navigation inside its
 * segment, and a Server Action can reach data without rendering a layout at
 * all, so every page and every action underneath calls the Data Access Layer
 * again. That is where the decision that matters is made.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireSession();
  const sections = navFor(user.role);

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Fixed on large screens, its own scroll region so a long nav never
          drags the page with it. */}
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden border-r lg:sticky lg:top-0 lg:block lg:h-svh lg:overflow-y-auto">
        <div className="flex h-full flex-col px-4 py-5">
          <div className="px-3 pb-8">
            <WordMark />
          </div>

          <SidebarNav sections={sections} />

          <p className="text-sidebar-foreground/35 mt-auto px-3 pt-8 font-mono text-[0.55rem] leading-relaxed tracking-[0.14em] uppercase">
            {user.role === "ADMIN" ? "Full access" : "Your records only"}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-border bg-background/85 sticky top-0 z-30 border-b backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <MobileNav sections={sections} />
            <Breadcrumbs />

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <UserMenu user={user} signOut={signOut} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
