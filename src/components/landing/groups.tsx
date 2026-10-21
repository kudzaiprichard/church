import { ArrowRight } from "lucide-react";

import type { PublicGroup } from "@/lib/settings";

import { Reveal } from "./reveal";
import { Section, SectionHeader } from "./section";

/**
 * The connect groups as compact tiles — who each one is for, what it does and
 * who leads it — with an eighth tile for anyone who isn't sure yet, which also
 * squares off the grid.
 *
 * Read from the database, so a new leader's name appears here as soon as they
 * are appointed. A group without one says Vacant rather than pretending.
 */
export function Groups({ groups }: { groups: PublicGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <Section id="groups" grid>
      <SectionHeader
        align="center"
        eyebrow="Connect groups"
        title="Find your family within the family"
        description={`${groups.length === 7 ? "Seven" : groups.length} groups meet through the week. Come to one as a guest before you decide.`}
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((group, index) => (
          <li key={group.slug}>
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
                {group.description && (
                  <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                    {group.description}
                  </p>
                )}
                <p className="border-border text-muted-foreground mt-4 border-t pt-3 text-xs">
                  <span className="font-medium">Leader: </span>
                  <span className={group.leader ? "text-foreground" : "italic"}>
                    {group.leader ?? "Vacant"}
                  </span>
                </p>
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
                <span className="text-primary block text-sm font-bold">
                  Not sure where you fit?
                </span>
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
