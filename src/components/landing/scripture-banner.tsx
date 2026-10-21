import { anchorScripture } from "@/lib/church";

import { Reveal } from "./reveal";

/**
 * The verse the church stands under, on parchment between the blue hero and
 * the white page. Set in Cormorant italic — scripture is the one voice on the
 * page that isn't the church's own — under a large, faint opening quote mark
 * instead of a rule.
 */
export function ScriptureBanner() {
  return (
    <section className="bg-parchment relative overflow-hidden py-14 md:py-20">
      <figure className="relative mx-auto max-w-3xl px-4 text-center">
        {/* In flow above the verse, cropped by its own line box, so it can
            never sit on top of the words. */}
        <span
          aria-hidden
          className="font-serif text-brass/45 block h-12 text-[7rem] leading-[0.95] select-none md:h-14 md:text-[8.5rem]"
        >
          &ldquo;
        </span>
        <Reveal from="mask">
          <blockquote>
            <p className="font-serif text-navy text-[1.65rem] leading-snug font-medium text-balance italic md:text-[2.4rem]">
              {anchorScripture.text}
            </p>
          </blockquote>
        </Reveal>
        <Reveal delay={120}>
          <figcaption className="text-accent-foreground mt-5 text-xs font-semibold tracking-[0.2em] uppercase">
            {anchorScripture.reference}
          </figcaption>
        </Reveal>
      </figure>
    </section>
  );
}
