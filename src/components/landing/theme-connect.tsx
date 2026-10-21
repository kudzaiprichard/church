import { ArrowUpRight } from "lucide-react";

import { lastUpdatedLine } from "@/lib/last-updated";
import type { SocialLinkDto, Theme } from "@/lib/settings";
import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";
import { Eyebrow, Section, SectionHeader } from "./section";
import { brand, PLATFORM_NAME, SocialGlyph } from "./social-icons";

/**
 * The theme of the year on a lit blue panel, and beside it every channel the
 * church posts on — as rows you can tap, not a strip of unlabelled icons.
 *
 * Both come from Settings, so a new theme or a changed handle shows here on
 * the next page load. With neither configured the section is left out rather
 * than drawn empty.
 */
export function ThemeConnect({
  theme,
  socials,
}: {
  theme: Theme | null;
  socials: SocialLinkDto[];
}) {
  if (!theme && socials.length === 0) return null;

  return (
    <Section id="theme">
      <SectionHeader
        eyebrow={theme ? `Theme of the year · ${theme.year}` : "Follow along"}
        title="One word over the whole year"
        description="Every January the church receives a theme for the twelve months ahead. It shapes what is preached, prayed and planned."
      />

      <div className="grid gap-4 lg:grid-cols-5">
        {theme && (
          <Reveal from="left" className={socials.length > 0 ? "lg:col-span-3" : "lg:col-span-5"}>
            <article className="bg-hero relative h-full overflow-hidden rounded-2xl p-7 text-white md:p-10">
              <div aria-hidden className="bg-grid-light pointer-events-none absolute inset-0" />
              <span
                aria-hidden
                className="font-display pointer-events-none absolute -right-4 -bottom-10 text-[9rem] leading-none font-bold text-white/[0.06] select-none md:text-[11rem]"
              >
                {theme.year}
              </span>

              <div className="relative">
                <Eyebrow className="text-brass">KMMI International</Eyebrow>
                <h3 className="mt-4 text-2xl leading-tight font-bold md:text-[2rem]">
                  {theme.title}
                </h3>

                <figure className="mt-6">
                  <blockquote>
                    <p className="font-serif text-xl leading-snug font-medium text-pretty text-white/90 italic md:text-2xl">
                      &ldquo;{theme.verseText}&rdquo;
                    </p>
                  </blockquote>
                  <figcaption className="text-brass mt-3 text-xs font-semibold tracking-[0.16em] uppercase">
                    {theme.scriptureRef}
                  </figcaption>
                </figure>

                {theme.description && (
                  <p className="mt-6 max-w-lg text-sm leading-relaxed text-white/65">
                    {theme.description}
                  </p>
                )}

                <p className="mt-6 text-xs text-white/45">
                  {lastUpdatedLine(theme.updatedBy, theme.updatedAt)}
                </p>
              </div>
            </article>
          </Reveal>
        )}

        {socials.length > 0 && (
          <Reveal from="right" delay={100} className={theme ? "lg:col-span-2" : "lg:col-span-5"}>
            <aside className="bg-card border-border flex h-full flex-col rounded-2xl border p-6 md:p-7">
              <h3 className="text-navy text-lg font-bold">Follow along online</h3>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                Live services, daily devotions and news from KMMI leaders.
              </p>

              <ul className="mt-5 grid gap-1">
                {socials.map((social) => {
                  const name = PLATFORM_NAME[social.platform];
                  return (
                    <li key={social.platform}>
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group hover:bg-muted -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                      >
                        <span
                          className={cn(
                            "bg-secondary text-primary flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:text-white",
                            brand[name].hover,
                          )}
                        >
                          <SocialGlyph name={name} className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-foreground block text-sm font-semibold">
                            {name}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {social.handle}
                          </span>
                        </span>
                        <ArrowUpRight
                          aria-hidden
                          className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                        />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </Reveal>
        )}
      </div>
    </Section>
  );
}
