import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/auth/dal";
import { authorOptions, getDevotionForEdit } from "@/lib/data/devotions";

import { PageHeader, Panel } from "../../../_components/page-parts";
import { DeleteDevotionButton, DevotionForm } from "../../devotion-form";

export const metadata: Metadata = { title: "Edit devotion" };

/** Apostles only; each action checks again. */
export default async function EditDevotionPage(props: PageProps<"/devotions/[id]/edit">) {
  const user = await requirePermission("devotions.manage");
  const { id } = await props.params;

  const [devotion, authors] = await Promise.all([getDevotionForEdit(user, id), authorOptions()]);
  if (!devotion) notFound();

  return (
    <>
      <PageHeader eyebrow="Devotions" title={`Edit ${devotion.title}`} />
      <div className="grid max-w-3xl gap-4">
        <Panel>
          <DevotionForm stored={devotion} authors={authors} defaultAuthorId={user.id} />
        </Panel>
        <Panel title="Delete">
          <DeleteDevotionButton devotionId={devotion.id} />
        </Panel>
      </div>
    </>
  );
}
