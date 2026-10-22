import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ledGroupIds, requireSession } from "@/lib/auth/dal";
import { composeOptions } from "@/lib/data/messages";
import { mayCompose } from "@/lib/messages/rules";

import { PageHeader, Panel } from "../../_components/page-parts";

import { ComposeForm } from "./compose-form";

export const metadata: Metadata = { title: "New message" };

/**
 * Compose (docs/SCOPE.md §9.5). Apostles and group leaders only — members
 * reply, they do not start messages. `?group=` and `?to=` preselect a target
 * from the group page, and are honoured only when they name a target this
 * person may use.
 */
export default async function ComposePage(props: PageProps<"/messages/new">) {
  const user = await requireSession();
  if (!mayCompose(user, await ledGroupIds(user))) redirect("/messages");

  const params = await props.searchParams;
  const one = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : undefined;
  const options = await composeOptions(user);

  const groupId = options.groups.find((group) => group.id === one(params.group))?.id;
  const recipientId = options.people.find((person) => person.id === one(params.to))?.id;

  // A link from a group or a member wins; otherwise the widest target offered.
  let audience: "ALL" | "GROUP" | "INDIVIDUAL" = options.all
    ? "ALL"
    : options.groups.length > 0
      ? "GROUP"
      : "INDIVIDUAL";
  if (groupId) audience = "GROUP";
  if (recipientId) audience = "INDIVIDUAL";

  return (
    <>
      <PageHeader
        eyebrow="Messages"
        title="New message"
        description={
          options.all
            ? "To the whole church, a group, or one person."
            : "To a group you lead, or one of its members."
        }
      />
      <Panel className="max-w-3xl">
        <ComposeForm options={options} initial={{ audience, groupId, recipientId }} />
      </Panel>
    </>
  );
}
