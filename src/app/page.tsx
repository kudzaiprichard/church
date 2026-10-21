import { Closing } from "@/components/landing/closing";
import { Devotion } from "@/components/landing/devotion";
import { Features } from "@/components/landing/features";
import { Groups } from "@/components/landing/groups";
import { Hero } from "@/components/landing/hero";
import { PlanVisit } from "@/components/landing/plan-visit";
import { ScriptureBanner } from "@/components/landing/scripture-banner";
import { Sermons } from "@/components/landing/sermons";
import { SiteNav } from "@/components/landing/site-nav";
import { ThemeConnect } from "@/components/landing/theme-connect";
import { getSession } from "@/lib/auth/dal";
import { getChurchInfo, getPublicGroups, getThemes, getVisibleSocialLinks } from "@/lib/settings";

/**
 * The KMMI landing page, in the portal's order:
 *
 *   hero          the blue band — theme, crest, name, the way in
 *   scripture     Matthew 6:10 on parchment
 *   theme         the theme of the year, and the channels to follow
 *   features      what the member portal offers
 *   groups        the connect groups
 *   devotion      today's devotion, opened and faded
 *   sermons       the latest messages
 *   visit         service times, and the form that tells the door you're coming
 *
 * The church's details, theme, social links and groups come from Settings —
 * cached, and expired the moment an Apostle saves, so a change is on this page
 * at the next load. Devotion and sermons are still static until Phase 4.
 *
 * The wrapper clips horizontally (`clip`, not `hidden`): reveals that arrive
 * from the side sit 32px outside their column while they travel, which is
 * wider than the gutter on a phone and otherwise puts a scrollbar on the body.
 */
export default async function Home() {
  /**
   * Read here rather than inside the nav, because the nav is a Client Component
   * and the session lives behind an httpOnly cookie and a database lookup.
   *
   * Only a first name crosses the boundary — enough to greet someone on the
   * way back into the portal. This is the whole reason `getSession`
   * returns a DTO: passing the row itself would ship a password hash and
   * lockout counters to the browser of anyone who viewed the home page.
   */
  const [user, church, { current: theme }, socials, groups] = await Promise.all([
    getSession(),
    getChurchInfo(),
    getThemes(),
    getVisibleSocialLinks(),
    getPublicGroups(),
  ]);
  const contact = { phone: church.phone, address: church.address, mapUrl: church.mapUrl };

  return (
    <div className="bg-background relative min-h-screen overflow-x-clip">
      <SiteNav session={user ? { firstName: user.firstName } : null} contact={contact} />

      <main>
        <Hero theme={theme} tagline={church.tagline} groupCount={groups.length} />
        <ScriptureBanner />
        <ThemeConnect theme={theme} socials={socials} />
        <Features />
        <Groups groups={groups} />
        <Devotion />
        <Sermons />
        <PlanVisit contact={contact} />
      </main>

      <Closing />
    </div>
  );
}
