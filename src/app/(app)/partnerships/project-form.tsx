"use client";

import { useActionState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";

import { FormSuccess, TextAreaField, TextField } from "../_components/form-fields";
import { financeIdleState } from "../finance/form-state";

import { completeProject, createProject, updateProject } from "./actions";

type ProjectValues = {
  name: string;
  description: string | null;
  targetAmount: string;
  startDate: string;
  endDate: string | null;
};

export function ProjectForm({ projectId, stored }: { projectId?: string; stored?: ProjectValues }) {
  const [state, action] = useActionState(
    projectId ? updateProject.bind(null, projectId) : createProject,
    financeIdleState,
  );
  const value = (key: keyof ProjectValues) => (state.values ? state.values[key] : stored?.[key]);
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
          id="targetAmount"
          name="targetAmount"
          label="Target (USD)"
          required
          defaultValue={value("targetAmount")}
          error={errors.targetAmount}
        />
        <TextField
          id="startDate"
          name="startDate"
          type="date"
          label="Starts"
          required
          defaultValue={value("startDate")}
          error={errors.startDate}
        />
        <TextField
          id="endDate"
          name="endDate"
          type="date"
          label="Ends"
          defaultValue={value("endDate")}
          error={errors.endDate}
        />
      </div>
      <TextAreaField
        id="description"
        name="description"
        label="Description"
        rows={3}
        defaultValue={value("description")}
        error={errors.description}
      />
      <div className="sm:max-w-xs">
        <Submit pendingLabel="Saving…">{projectId ? "Save" : "Create project"}</Submit>
      </div>
    </form>
  );
}

/** Mark complete, behind a ticked confirmation. */
export function CompleteProjectForm({ projectId, name }: { projectId: string; name: string }) {
  const [state, action] = useActionState(completeProject.bind(null, projectId), financeIdleState);

  return (
    <form key={state.attempt ?? "empty"} action={action} className="grid gap-3">
      <FormError>{state.error}</FormError>
      <FormSuccess>{state.done}</FormSuccess>
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="confirm" className="accent-primary mt-0.5 size-4" />
        <span>
          {name} has reached its goal or is closing. It will stop accepting contributions, and this
          cannot be undone from the portal.
        </span>
      </label>
      <div>
        <button
          type="submit"
          className="border-border hover:bg-muted h-9 cursor-pointer rounded-md border px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          Mark complete
        </button>
      </div>
    </form>
  );
}
