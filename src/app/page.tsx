import type { Metadata } from "next";

import { Closing } from "@/components/landing/closing";
import { Events } from "@/components/landing/events";
import { Hero } from "@/components/landing/hero";
import { HymnBoard } from "@/components/landing/hymn-board";
import { LancetClipDef } from "@/components/landing/lancet-clip";
import { QuoteBand } from "@/components/landing/quote-band";
import { RoseWindow } from "@/components/landing/rose-window";
import { Section } from "@/components/landing/section";
import { Sermons } from "@/components/landing/sermons";
import { SiteNav } from "@/components/landing/site-nav";
import { TwoTiers } from "@/components/landing/two-tiers";
import { Visit } from "@/components/landing/visit";
import { WeeklyRhythm } from "@/components/landing/weekly-rhythm";
import { church } from "@/lib/church";

export const metadata: Metadata = {
  title: `${church.name} — ${church.address.city}`,
  description: church.tagline,
};

export default function Home() {
  return (
    <>
      <LancetClipDef />
      <SiteNav />

      <main>
        <Hero />

        <Section
          id="visit"
          numeral="II"
          label="Planning a visit"
          heading="What a Sunday actually looks like."
          intro="If you have never been, this is everything you would otherwise have to ask someone at the door."
        >
          <Visit />
        </Section>

        <Section
          id="week"
          numeral="III"
          label="The rhythm"
          heading="The week we keep together."
          intro="Sunday sets the pace, and the rest of the week carries it — groups in homes, prayer in the chapel, youth in the hall."
          className="bg-card border-border border-y"
        >
          <WeeklyRhythm />
        </Section>

        <QuoteBand />

        <Section
          id="ministries"
          numeral="IV"
          label="Twelve ministries"
          heading="One window, twelve lights."
          intro="Every part of the church's life, and the people who carry it. Choose a light to see what it does and who it is for."
        >
          <RoseWindow />
        </Section>

        <Section
          id="sermons"
          numeral="V"
          label="Teaching"
          heading="What we are working through."
          intro="Sermons are posted by Monday evening, with the passage and who preached it. Members can keep private notes against any of them."
          className="bg-card border-border border-y"
        >
          <Sermons />
        </Section>

        <Section
          id="events"
          numeral="VI"
          label="What's on"
          heading="Coming up at the chapel."
          intro="The next few things worth putting in a diary. Members get a reminder before each one."
        >
          <Events />
        </Section>

        <Section
          id="members"
          numeral="VII"
          label="Members"
          heading="Two doors into the same church."
          intro="Most of this site is open to anyone. Signing in adds the part that is only yours — your giving, your groups, your notes."
        >
          <TwoTiers />
        </Section>

        <Section
          id="numbers"
          numeral="VIII"
          label="Last Sunday"
          heading="The board, after a service."
          intro="What the week left behind, counted."
          className="bg-card border-border border-y"
        >
          <HymnBoard />
        </Section>
      </main>

      <Closing />
    </>
  );
}
