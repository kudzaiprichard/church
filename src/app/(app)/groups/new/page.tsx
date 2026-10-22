import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth/dal";

import { PageHeader, Panel } from "../../_components/page-parts";
import { GroupForm } from "../group-form";

export const metadata: Metadata = { title: "New group" };

/** Apostles only; `createGroup` checks again. */
export default async function NewGroupPage() {
  await requirePermission("groups.manage");

  return (
    <>
      <PageHeader
        eyebrow="Connect groups"
        title="New group"
        description="Name it and say who it is for. Appoint a leader and add members once it exists."
      />
      <Panel className="max-w-3xl">
        <GroupForm />
      </Panel>
    </>
  );
}
