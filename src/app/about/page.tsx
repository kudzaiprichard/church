import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { Closing } from "@/components/landing/closing";
import { Eyebrow, Section, SectionHeader } from "@/components/landing/section";
import { SiteNav } from "@/components/landing/site-nav";
import { getSession } from "@/lib/auth/dal";
import { churchIdentity } from "@/lib/church";
import { lastUpdatedLine } from "@/lib/last-updated";
import { getChurchInfo, getLeadership, getThemes } from "@/lib/settings";

export const metadata: Metadata = {
  title: "About",
  description: `Who ${churchIdentity.name} is: mission, vision, what we believe and who leads us.`,
};

/** Paragraphs separated by a blank line, as the settings form asks for. */
function paragraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * About the church (docs/SCOPE.md §9.19): mission, vision, doctrine,
 * leadership, the Theme of the Year and its history, and how to reach the
 * office.
 *
 * Every word comes from Settings, read through the cached getters, so an
 * Apostle's edit is here on the next load. A section with nothing written for
 * it is left out rather than shown empty.
 */
export default async function AboutPage() {
  const [user, church, { current, history }, leaders] = await Promise.all([
    getSession(),
    getChurchInfo(),
    getThemes(),
    getLeadership(),
  ]);

  const statements = [
    { id: "mission", title: "Our mission", text: church.mission },
    { id: "vision", title: "Our vision", text: church.vision },
    { id: "beliefs", title: "What we believe", text: church.doctrine },
  ].filter((entry): entry is { id: string; title: string; text: string } => Boolean(entry.text));

  return (
    <div className="bg-background relative min-h-screen overflow-x-clip">
      <SiteNav
        session={user ? { firstName: user.firstName } : null}
        contact={{ phone: church.phone, address: church.address, mapUrl: church.mapUrl }}
      />

      <main>
        <section className="bg-hero relative overflow-hidden text-white">
          <div aria-hidden className="bg-grid-light pointer-events-none absolute inset-0" />
          <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pt-32 pb-16 text-center sm:px-6 md:pt-36 lg:px-8">
            <Logo size={64} />
            <Eyebrow className="text-brass mt-7">About us</Eyebrow>
            <h1 className="font-display mt-4 text-3xl leading-tight font-bold tracking-[0.02em] text-balance sm:text-5xl">
              {church.name}
            </h1>
            {church.tagline && (
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-white/75">
                {church.tagline}
              </p>
            )}
          </div>
        </section>

        {statements.length > 0 && (
          <Section>
            <div className="grid gap-12 lg:grid-cols-3 lg:gap-10">
              {statements.map((statement) => (
                <article key={statement.id} id={statement.id} className="scroll-mt-20">
                  <Eyebrow>{statement.title}</Eyebrow>
                  <div className="text-foreground/85 mt-4 space-y-4 leading-relaxed text-pretty">
                    {paragraphs(statement.text).map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </Section>
        )}

        {leaders.length > 0 && (
          <Section id="leadership" tone="tint">
            <SectionHeader
              eyebrow="Leadership"
              title="Who leads the church"
              description="The offices of the church, as the congregation knows them."
            />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {leaders.map((leader) => (
                <li
                  key={`${leader.office}-${leader.name}`}
                  className="bg-card border-border flex items-center gap-3 rounded-xl border p-5"
                >
                  <span
                    aria-hidden
                    className="bg-secondary text-primary grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold"
                  >
                    {leader.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part.charAt(0))
                      .join("")}
                  </span>
                  <span className="min-w-0">
                    <span className="text-foreground block font-semibold">{leader.name}</span>
                    <span className="text-accent-foreground block text-xs font-semibold tracking-wide uppercase">
                      {leader.office}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {current && (
          <Section id="theme">
            <SectionHeader
              eyebrow={`Theme of the year · ${current.year}`}
              title={current.title}
              description={current.description ?? undefined}
            />
            <div className="grid gap-4 lg:grid-cols-5">
              <figure className="bg-hero relative overflow-hidden rounded-2xl p-7 text-white md:p-10 lg:col-span-3">
                <div aria-hidden className="bg-grid-light pointer-events-none absolute inset-0" />
                <blockquote className="relative">
                  <p className="font-serif text-xl leading-snug font-medium text-pretty text-white/90 italic md:text-2xl">
                    &ldquo;{current.verseText}&rdquo;
                  </p>
                </blockquote>
                <figcaption className="text-brass relative mt-3 text-xs font-semibold tracking-[0.16em] uppercase">
                  {current.scriptureRef}
                </figcaption>
                <p className="relative mt-6 text-xs text-white/45">
                  {lastUpdatedLine(current.updatedBy, current.updatedAt)}
                </p>
              </figure>

              {history.length > 0 && (
                <div className="bg-card border-border rounded-2xl border p-6 lg:col-span-2">
                  <h3 className="text-navy text-lg font-bold">Previous years</h3>
                  <table className="mt-4 w-full text-sm">
                    <caption className="sr-only">Themes of previous years</caption>
                    <thead className="sr-only">
                      <tr>
                        <th scope="col">Year</th>
                        <th scope="col">Theme</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {history.map((theme) => (
                        <tr key={theme.year}>
                          <th
                            scope="row"
                            className="numeric text-primary w-14 py-3 text-left align-top font-semibold"
                          >
                            {theme.year}
                          </th>
                          <td className="py-3">
                            <span className="text-foreground block font-semibold">
                              {theme.title}
                            </span>
                            <span className="text-muted-foreground block text-xs">
                              {theme.scriptureRef}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Section>
        )}

        {(church.address || church.phone || church.email) && (
          <Section id="contact" tone="tint">
            <SectionHeader eyebrow="Contact" title="Reach the church office" />
            <dl className="grid gap-4 sm:grid-cols-3">
              {church.address && (
                <ContactItem label="Visit">
                  {church.mapUrl ? (
                    <a href={church.mapUrl} target="_blank" rel="noopener noreferrer">
                      {church.address}
                    </a>
                  ) : (
                    church.address
                  )}
                </ContactItem>
              )}
              {church.phone && (
                <ContactItem label="Call">
                  <a href={`tel:${church.phone.replace(/\s/g, "")}`}>{church.phone}</a>
                </ContactItem>
              )}
              {church.email && (
                <ContactItem label="Write">
                  <a href={`mailto:${church.email}`}>{church.email}</a>
                </ContactItem>
              )}
            </dl>
          </Section>
        )}
      </main>

      <Closing />
    </div>
  );
}

function ContactItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-card border-border rounded-xl border p-5">
      <dt className="text-accent-foreground text-xs font-semibold tracking-[0.16em] uppercase">
        {label}
      </dt>
      <dd className="text-foreground [&_a]:text-primary mt-2 font-medium break-words [&_a]:underline-offset-4 [&_a:hover]:underline">
        {children}
      </dd>
    </div>
  );
}
