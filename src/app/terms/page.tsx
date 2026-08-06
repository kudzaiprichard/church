import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";
import { church } from "@/lib/church";

export const metadata: Metadata = {
  title: "Terms",
  description: `Terms of use for the ${church.name} website.`,
};

export default function Terms() {
  return (
    <LegalPage title="Terms of use" updated="August 2026">
      <section>
        <h2>This is a church website</h2>
        <p>
          It exists to tell you when we meet, where we are, and what happens when you get here. You
          are welcome to read it, share it, print it, and pass the address on to anyone.
        </p>
      </section>

      <section>
        <h2>Times can change</h2>
        <p>
          We keep the service times and the calendar on this page as current as we can, but a
          funeral, a burst pipe or a public holiday can move things at short notice. If you are
          travelling any distance to a specific event, call the office on{" "}
          <a href={`tel:${church.phone.replace(/\s/g, "")}`}>{church.phone}</a> first and we will
          confirm it.
        </p>
      </section>

      <section>
        <h2>What you send us</h2>
        <p>
          Please use the forms on this site for what they are for. Do not send anything unlawful, and
          do not submit somebody else&apos;s details as though they were your own. We may stop
          responding to a sender who abuses the forms.
        </p>
      </section>

      <section>
        <h2>Sermons and written material</h2>
        <p>
          Sermons, service outlines and the weekly bulletin belong to {church.name}. Copy them,
          quote them and use them in your own church or study group freely — we only ask that you do
          not sell them or present them as your own work.
        </p>
      </section>

      <section>
        <h2>Links to other sites</h2>
        <p>
          Where this site links somewhere else — a map, a partner church, a social media page — we
          have no control over what is on the other end and are not responsible for it.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We will update this page when something about the site changes, and the date at the top
          will tell you when that last happened.
        </p>
      </section>
    </LegalPage>
  );
}
