import type { Metadata } from "next";
import { connection } from "next/server";

import { LegalPage } from "@/components/landing/legal-page";
import { churchIdentity } from "@/lib/church";
import { getChurchInfo } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${churchIdentity.name} handles the details you give us.`,
};

/**
 * Rendered per request (from the cached settings) so the office's contact
 * details here are always the ones in Settings, not those at build time.
 */
export default async function Privacy() {
  await connection();
  const church = await getChurchInfo();
  const email = church.email ? <a href={`mailto:${church.email}`}>{church.email}</a> : null;

  return (
    <LegalPage title="Privacy" updated="August 2026">
      <section>
        <h2>What we collect</h2>
        <p>
          Only what you type into one of the two forms on this site, and nothing else. There is no
          analytics script, no advertising pixel and no third-party tracker anywhere on these pages.
        </p>
        <ul>
          <li>
            <strong>Planning a visit</strong> — your name, your email address, which service you are
            thinking of coming to, and anything you choose to write in the note.
          </li>
          <li>
            <strong>The weekly bulletin</strong> — your email address.
          </li>
        </ul>
      </section>

      <section>
        <h2>What we do with it</h2>
        <p>
          Both forms send an email to the church office{email && <> at {email}</>}. Someone reads
          it, looks out for you on Sunday, or adds you to the bulletin list. That is the whole of
          it. We do not sell it, we do not trade it, and we do not use it to advertise anything to
          you.
        </p>
      </section>

      <section>
        <h2>Who else sees it</h2>
        <p>
          The email is delivered by Resend, our mail provider, which processes it on our behalf in
          order to get it to the office. Nobody else outside the church staff and the ministry
          volunteers who need it will see what you send.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          Visit enquiries are kept for as long as it takes to follow them up and then deleted.
          Bulletin subscriptions are kept until you ask to come off the list — every bulletin has an
          unsubscribe link, and replying to say &ldquo;stop&rdquo; works just as well.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          This site sets no cookies. If you switch between the light and dark version of the page,
          that preference is stored locally in your own browser and never sent to us.
        </p>
      </section>

      <section>
        <h2>Asking us to change or delete something</h2>
        <p>
          {email ? <>Write to {email}</> : "Write to the church office"}
          {church.phone && (
            <>
              {" "}
              or call the office on{" "}
              <a href={`tel:${church.phone.replace(/\s/g, "")}`}>{church.phone}</a>
            </>
          )}{" "}
          and we will find what we hold about you, correct it, or delete it. You do not have to give
          a reason.
        </p>
      </section>
    </LegalPage>
  );
}
