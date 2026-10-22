import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth/dal";
import { sermonFacets } from "@/lib/data/sermons";
import { harareToday } from "@/lib/dates";
import { storageIsConfigured } from "@/lib/storage";

import { PageHeader, Panel } from "../../_components/page-parts";
import { SermonForm } from "../sermon-form";

export const metadata: Metadata = { title: "Add sermon" };

/** Apostles only; `createSermon` checks again. */
export default async function NewSermonPage() {
  const user = await requirePermission("sermons.manage");
  const facets = await sermonFacets(user);

  return (
    <>
      <PageHeader
        eyebrow="Sermons"
        title="Add sermon"
        description="Audio and handouts upload as soon as you choose them; save the form to keep them."
      />
      <Panel className="max-w-3xl">
        <SermonForm
          seriesSuggestions={facets.seriesSuggestions}
          uploads={storageIsConfigured}
          today={harareToday()}
        />
      </Panel>
    </>
  );
}
