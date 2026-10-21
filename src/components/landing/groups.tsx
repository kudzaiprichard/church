import { ArrowRight } from "lucide-react";

import { connectGroups } from "@/lib/church";

import { Reveal } from "./reveal";
import { Section, SectionHeader } from "./section";

/**
 * The connect groups as compact tiles — who each one is for and what it does —
 * with an eighth tile for anyone who isn't sure yet, which also squares off
 * the grid.
 */
export function Groups() {
  return (
    <Section id="groups" grid>
      <SectionHeader
        align="center"
        eyebrow="Connect groups"
        title="Find your family within the family"
        description="Seven groups meet through the week. Come to one as a guest before you decide."
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {connectGroups.map((group, index) => (
          <li key={group.name}>
            <Reveal delay={(index % 4) * 70} className="h-full">
              <article className="group bg-card border-border hover:border-primary/30 h-full rounded-xl border p-5 transition-colors">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold transition-colors"
                  >
                    {group.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-foreground truncate text-sm font-bold">{group.name}</h3>
                    <p className="text-accent-foreground text-xs font-medium">{group.audience}</p>
                  </div>
                </div>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{group.detail}</p>
              </article>
            </Reveal>
          </li>
        ))}

        <li>
          <Reveal delay={210} className="h-full">
            <a
              href="#visit"
              className="group border-primary/25 bg-secondary/60 hover:bg-secondary flex h-full flex-col justify-between rounded-xl border border-dashed p-5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              <span>
                <span className="text-primary block text-sm font-bold">Not sure where you fit?</span>
                <span className="text-muted-foreground mt-1.5 block text-sm leading-relaxed">
                  Tell us when you&apos;re visiting and we&apos;ll introduce you.
                </span>
              </span>
              <ArrowRight
                aria-hidden
                className="text-primary mt-4 size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </a>
          </Reveal>
        </li>
      </ul>
    </Section>
  );
}
