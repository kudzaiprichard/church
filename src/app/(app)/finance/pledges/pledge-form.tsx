"use client";

import { useActionState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";

import { FormSuccess, SelectField, TextField } from "../../_components/form-fields";
import { createPledge } from "../actions";
import { financeIdleState } from "../form-state";

export function PledgeForm({ projects }: { projects: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createPledge, financeIdleState);
  const values = state.values;
  const errors = state.fieldErrors ?? {};

  return (
    <form key={state.attempt ?? "empty"} action={action} className="grid gap-4" noValidate>
      <FormError>{state.error}</FormError>
      <FormSuccess>{state.done}</FormSuccess>
      <TextField
        id="description"
        name="description"
        label="What it is for"
        required
        defaultValue={values?.description}
        error={errors.description}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          id="totalAmount"
          name="totalAmount"
          label="Total (USD)"
          required
          defaultValue={values?.totalAmount}
          error={errors.totalAmount}
        />
        <TextField
          id="dueDate"
          name="dueDate"
          type="date"
          label="Due by"
          required
          defaultValue={values?.dueDate}
          error={errors.dueDate}
        />
        <SelectField
          id="projectId"
          name="projectId"
          label="Project"
          placeholder="None"
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
          defaultValue={values?.projectId}
          error={errors.projectId}
        />
      </div>
      <p className="text-muted-foreground -mt-2 text-xs">
        Payments you log against this pledge fill its progress bar once they are confirmed.
      </p>
      <div className="sm:max-w-xs">
        <Submit pendingLabel="Saving…">Make pledge</Submit>
      </div>
    </form>
  );
}
