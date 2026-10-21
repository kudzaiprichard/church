import { Logo } from "@/components/brand/logo";
import { devotion } from "@/lib/church";

import { ActionLink } from "./action";
import { Reveal } from "./reveal";
import { Eyebrow, Section } from "./section";

/**
 * Today's devotion as a split panel: the opening of the text on paper, and the
 * verse it hangs on set large on the blue, with the crest faint behind it.
 * The text fades out where the portal takes over.
 */
export function Devotion() {
  return (
    <Section tone="tint">
      <Reveal>
        <article className="bg-card border-border grid overflow-hidden rounded-2xl border md:grid-cols-[1.15fr_1fr]">
          <div className="p-7 md:p-10">
            <Eyebrow>Today&apos;s devotion</Eyebrow>

            <h2 className="text-navy mt-4 text-3xl leading-[1.1] font-bold text-balance md:text-[2.25rem]">
              {devotion.title}
            </h2>

            <div className="mt-5 flex items-center gap-3">
              <span
                aria-hidden
                className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-full text-[0.7rem] font-bold"
              >
                {devotion.initials}
              </span>
              <p className="text-foreground text-sm font-semibold">{devotion.author}</p>
            </div>

            <div className="relative mt-6">
              <p className="text-muted-foreground line-clamp-4 leading-relaxed">{devotion.opening}</p>
              <span
                aria-hidden
                className="from-card pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t to-transparent"
              />
            </div>

            <ActionLink href="/login" arrow className="mt-7">
              Continue reading
            </ActionLink>
          </div>

          <div className="bg-hero relative flex min-h-64 items-center overflow-hidden p-8 text-white md:p-10">
            <div aria-hidden className="bg-grid-light pointer-events-none absolute inset-0" />
            <Logo
              size={260}
              className="pointer-events-none absolute -right-16 -bottom-16 opacity-[0.07]"
            />
            <figure className="relative">
              <blockquote>
                <p className="font-serif text-2xl leading-snug font-medium text-balance italic md:text-3xl">
                  &ldquo;{devotion.scriptureQuote}&rdquo;
                </p>
              </blockquote>
              <figcaption className="text-brass mt-4 text-xs font-semibold tracking-[0.16em] uppercase">
                {devotion.scriptureReference}
              </figcaption>
            </figure>
          </div>
        </article>
      </Reveal>
    </Section>
  );
}
