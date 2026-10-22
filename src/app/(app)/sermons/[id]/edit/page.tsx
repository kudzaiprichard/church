import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/auth/dal";
import { getSermonForEdit, sermonFacets } from "@/lib/data/sermons";
import { harareToday } from "@/lib/dates";
import { storageIsConfigured } from "@/lib/storage";

import { PageHeader, Panel } from "../../../_components/page-parts";
import { deleteSermon } from "../../actions";
import { DeleteSermonButton, SermonForm } from "../../sermon-form";

export const metadata: Metadata = { title: "Edit sermon" };

/** Apostles only; each action checks again. */
export default async function EditSermonPage(props: PageProps<"/sermons/[id]/edit">) {
  const user = await requirePermission("sermons.manage");
  const { id } = await props.params;

  const [sermon, facets] = await Promise.all([getSermonForEdit(user, id), sermonFacets(user)]);
  if (!sermon) notFound();

  return (
    <>
      <PageHeader eyebrow="Sermons" title={`Edit ${sermon.title}`} />
      <div className="grid max-w-3xl gap-4">
        <Panel>
          <SermonForm
            stored={sermon}
            seriesSuggestions={facets.seriesSuggestions}
            uploads={storageIsConfigured}
            today={harareToday()}
          />
        </Panel>
        <Panel title="Delete">
          <DeleteSermonButton action={deleteSermon.bind(null, sermon.id)} />
        </Panel>
      </div>
    </>
  );
}
