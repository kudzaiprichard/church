import { ArrowUpRight } from "lucide-react";

import { socials, themeOfYear } from "@/lib/church";
import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";
import { Eyebrow, Section, SectionHeader } from "./section";
import { brand, SocialGlyph } from "./social-icons";

/**
 * The theme of the year on a lit blue panel, and beside it every channel the
 * church posts on — as rows you can tap, not a strip of unlabelled icons.
 */
export function ThemeConnect() {
  return (
    <Section id="theme">
      <SectionHeader
        eyebrow={`Theme of the year · ${themeOfYear.year}`}
        title="One word over the whole year"
        description="Every January the church receives a theme for the twelve months ahead. It shapes what is preached, prayed and planned."
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Reveal from="left" className="lg:col-span-3">
          <article className="bg-hero relative h-full overflow-hidden rounded-2xl p-7 text-white md:p-10">
            <div aria-hidden className="bg-grid-light pointer-events-none absolute inset-0" />
            <span
              aria-hidden
              className="font-display pointer-events-none absolute -right-4 -bottom-10 text-[9rem] leading-none font-bold text-white/[0.06] select-none md:text-[11rem]"
            >
              {themeOfYear.year}
            </span>

            <div className="relative">
              <Eyebrow className="text-brass">KMMI International</Eyebrow>
              <h3 className="mt-4 text-2xl leading-tight font-bold md:text-[2rem]">
                {themeOfYear.title}
              </h3>

              <figure className="mt-6">
                <blockquote>
                  <p className="font-serif text-xl leading-snug font-medium text-pretty text-white/90 italic md:text-2xl">
                    &ldquo;{themeOfYear.verseText}&rdquo;
                  </p>
                </blockquote>
                <figcaption className="text-brass mt-3 text-xs font-semibold tracking-[0.16em] uppercase">
                  {themeOfYear.scripture}
                </figcaption>
              </figure>

              <p className="mt-6 max-w-lg text-sm leading-relaxed text-white/65">
                {themeOfYear.description}
              </p>
            </div>
          </article>
        </Reveal>

        <Reveal from="right" delay={100} className="lg:col-span-2">
          <aside className="bg-card border-border flex h-full flex-col rounded-2xl border p-6 md:p-7">
            <h3 className="text-navy text-lg font-bold">Follow along online</h3>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              Live services, daily devotions and news from KMMI leaders.
            </p>

            <ul className="mt-5 grid gap-1">
              {socials.map((social) => (
                <li key={social.name}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group hover:bg-muted -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  >
                    <span
                      className={cn(
                        "bg-secondary text-primary flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:text-white",
                        brand[social.name].hover,
                      )}
                    >
                      <SocialGlyph name={social.name} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground block text-sm font-semibold">
                        {social.name}
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
              ))}
            </ul>
          </aside>
        </Reveal>
      </div>
    </Section>
  );
}
