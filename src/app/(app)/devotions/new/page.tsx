import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth/dal";
import { authorOptions } from "@/lib/data/devotions";

import { PageHeader, Panel } from "../../_components/page-parts";
import { DevotionForm } from "../devotion-form";

export const metadata: Metadata = { title: "New devotion" };

/** Apostles only; `createDevotion` checks again. */
export default async function NewDevotionPage() {
  const user = await requirePermission("devotions.manage");
  const authors = await authorOptions();

  return (
    <>
      <PageHeader
        eyebrow="Devotions"
        title="New devotion"
        description="Give it a date to schedule it; it appears that morning in Harare. Leave the date empty to keep a draft."
      />
      <Panel className="max-w-3xl">
        <DevotionForm authors={authors} defaultAuthorId={user.id} />
      </Panel>
    </>
  );
}
