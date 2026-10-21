import { BookOpen, CalendarDays, HandCoins, Users } from "lucide-react";

import { portalFeatures } from "@/lib/church";

import { ActionLink } from "./action";
import { Reveal } from "./reveal";
import { Section, SectionHeader } from "./section";

const icons = {
  book: BookOpen,
  calendar: CalendarDays,
  giving: HandCoins,
  groups: Users,
};

/**
 * What the member portal offers. Four flat tiles on the tinted ground; hover
 * only warms the border and tints the icon — the tile itself never moves.
 */
export function Features() {
  return (
    <Section id="portal" tone="tint">
      <SectionHeader
        eyebrow="Member portal"
        title="Everything your church life needs, in one place"
        description="Members sign in to read the day's devotion, see what's on, give, and stay close to their connect group."
        action={
          <ActionLink href="/login" tone="outline" arrow>
            Sign in
          </ActionLink>
        }
      />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {portalFeatures.map((feature, index) => {
          const Icon = icons[feature.icon];
          return (
            <li key={feature.title}>
              <Reveal delay={index * 70} className="h-full">
                <article className="group bg-card border-border hover:border-primary/30 h-full rounded-xl border p-6 transition-colors">
                  <div className="flex items-start justify-between">
                    <span className="bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground flex size-10 items-center justify-center rounded-lg transition-colors">
                      <Icon aria-hidden className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="numeric text-muted-foreground/60 text-xs">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-foreground mt-5 text-base font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {feature.detail}
                  </p>
                </article>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
