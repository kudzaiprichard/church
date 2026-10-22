"use client";

import { useActionState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";
import type { PersonOption } from "@/lib/data/groups";

import {
  CheckboxGroupField,
  FormSuccess,
  SelectField,
  TextAreaField,
  TextField,
} from "../_components/form-fields";

import { addMembers, createGroup, deleteGroup, setLeader, updateGroup } from "./actions";
import { groupIdleState } from "./form-state";

type GroupValues = { name: string; audience: string | null; description: string | null };

/** Name, audience and description — for a new group, or an existing one's. */
export function GroupForm({ groupId, stored }: { groupId?: string; stored?: GroupValues }) {
  const [state, action] = useActionState(
    groupId ? updateGroup.bind(null, groupId) : createGroup,
    groupIdleState,
  );
  const value = (key: keyof GroupValues) => (state.values ? state.values[key] : stored?.[key]);
  const errors = state.fieldErrors ?? {};

  return (
    <form key={state.attempt ?? "stored"} action={action} className="grid gap-4" noValidate>
      <FormError>{state.error}</FormError>
      <FormSuccess>{state.done}</FormSuccess>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="name"
          name="name"
          label="Name"
          required
          defaultValue={value("name")}
          error={errors.name}
        />
        <TextField
          id="audience"
          name="audience"
          label="Who it is for"
          hint="For example “Ages 13–25”."
          defaultValue={value("audience")}
          error={errors.audience}
        />
      </div>
      <TextAreaField
        id="description"
        name="description"
        label="Description"
        hint="Shown on the public website."
        rows={3}
        defaultValue={value("description")}
        error={errors.description}
      />

      <div className="sm:max-w-xs">
        <Submit pendingLabel="Saving…">{groupId ? "Save" : "Create group"}</Submit>
      </div>
    </form>
  );
}

export function LeaderForm({
  groupId,
  leaderId,
  people,
}: {
  groupId: string;
  leaderId: string | null;
  people: PersonOption[];
}) {
  const [state, action] = useActionState(setLeader.bind(null, groupId), groupIdleState);

  return (
    <form key={state.attempt ?? "stored"} action={action} className="grid gap-4" noValidate>
      <FormError>{state.error}</FormError>
      <FormSuccess>{state.done}</FormSuccess>
      <SelectField
        id="leaderId"
        name="leaderId"
        label="Leader"
        placeholder="Vacant — no leader"
        hint="They are added to the group if they are not in it. Their powers change on their next page load."
        options={people.map((person) => ({ value: person.id, label: person.name }))}
        defaultValue={state.values?.leaderId ?? leaderId}
        error={state.fieldErrors?.leaderId}
      />
      <div className="sm:max-w-xs">
        <Submit pendingLabel="Saving…">Set leader</Submit>
      </div>
    </form>
  );
}

export function AddMembersForm({ groupId, people }: { groupId: string; people: PersonOption[] }) {
  const [state, action] = useActionState(addMembers.bind(null, groupId), groupIdleState);

  if (people.length === 0) {
    return <p className="text-muted-foreground text-sm">Everyone active is already in this group.</p>;
  }

  return (
    <form key={state.attempt ?? "stored"} action={action} className="grid gap-4" noValidate>
      <FormError>{state.error}</FormError>
      <FormSuccess>{state.done}</FormSuccess>
      <div className="max-h-80 overflow-y-auto pr-1">
        <CheckboxGroupField
          id="userIds"
          name="userIds"
          label="People to add"
          hint="Each is told they were added."
          options={people.map((person) => ({
            value: person.id,
            label: person.name,
            detail: person.detail,
          }))}
          error={state.fieldErrors?.userIds}
        />
      </div>
      <div className="sm:max-w-xs">
        <Submit pendingLabel="Adding…">Add to group</Submit>
      </div>
    </form>
  );
}

export function DeleteGroupForm({ groupId, name }: { groupId: string; name: string }) {
  const [state, action] = useActionState(deleteGroup.bind(null, groupId), groupIdleState);

  return (
    <form action={action} className="grid gap-3">
      <FormError>{state.error}</FormError>
      <p className="text-muted-foreground text-sm text-pretty">
        Only an empty group can be deleted. Messages already sent to {name} stay in people&apos;s
        inboxes.
      </p>
      <div>
        <button
          type="submit"
          className="border-destructive/30 text-destructive hover:bg-destructive/10 h-9 cursor-pointer rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          Delete {name}
        </button>
      </div>
    </form>
  );
}
