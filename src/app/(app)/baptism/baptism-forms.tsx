"use client";

import { useActionState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";
import type { RecordRow } from "@/lib/data/baptism";

import {
  CheckboxGroupField,
  FormSuccess,
  TextAreaField,
  TextField,
} from "../_components/form-fields";
import { groupIdleState as idle } from "../groups/form-state";

import { createCandidate, createClass, enrollCandidates, updateRecord } from "./actions";

export function RecordForm({ record, today }: { record: RecordRow; today: string }) {
  const [state, action] = useActionState(updateRecord.bind(null, record.id), idle);
  const value = (key: keyof RecordRow) =>
    state.values ? state.values[key] : (record[key] as string | null);
  const errors = state.fieldErrors ?? {};

  return (
    <form key={state.attempt ?? "stored"} action={action} className="grid gap-4" noValidate>
      <FormError>{state.error}</FormError>
      <FormSuccess>{state.done}</FormSuccess>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="baptismDate"
          name="baptismDate"
          type="date"
          label="Baptized on"
          required
          max={today}
          defaultValue={value("baptismDate")}
          error={errors.baptismDate}
        />
        <TextField
          id="classCompletedOn"
          name="classCompletedOn"
          type="date"
          label="Baptismal class completed"
          max={today}
          defaultValue={value("classCompletedOn")}
          error={errors.classCompletedOn}
        />
        <TextField
          id="location"
          name="location"
          label="Where"
          required
          defaultValue={value("location")}
          error={errors.location}
        />
        <TextField
          id="conductedBy"
          name="conductedBy"
          label="Conducted by"
          required
          defaultValue={value("conductedBy")}
          error={errors.conductedBy}
        />
      </div>
      <TextAreaField id="notes" name="notes" label="Notes" rows={2} defaultValue={value("notes")} />
      <div className="sm:max-w-xs">
        <Submit pendingLabel="Saving…">Save record</Submit>
      </div>
    </form>
  );
}

export function CandidateForm() {
  const [state, action] = useActionState(createCandidate, idle);
  const values = state.values;
  const errors = state.fieldErrors ?? {};

  return (
    <form key={state.attempt ?? "empty"} action={action} className="grid gap-4" noValidate>
      <FormSuccess>{state.done}</FormSuccess>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="firstName"
          name="firstName"
          label="First name"
          required
          defaultValue={state.done ? "" : values?.firstName}
          error={errors.firstName}
        />
        <TextField
          id="lastName"
          name="lastName"
          label="Last name"
          required
          defaultValue={state.done ? "" : values?.lastName}
          error={errors.lastName}
        />
        <TextField
          id="phone"
          name="phone"
          type="tel"
          label="Phone"
          defaultValue={state.done ? "" : values?.phone}
          error={errors.phone}
        />
        <TextField
          id="email"
          name="email"
          type="email"
          label="Email"
          defaultValue={state.done ? "" : values?.email}
          error={errors.email}
        />
      </div>
      <TextAreaField
        id="notes"
        name="notes"
        label="Notes"
        rows={2}
        defaultValue={state.done ? "" : values?.notes}
      />
      <div className="sm:max-w-xs">
        <Submit pendingLabel="Adding…">Add candidate</Submit>
      </div>
    </form>
  );
}

export function ClassForm() {
  const [state, action] = useActionState(createClass, idle);
  const values = state.values;
  const errors = state.fieldErrors ?? {};

  return (
    <form key={state.attempt ?? "empty"} action={action} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="name"
          name="name"
          label="Class name"
          required
          defaultValue={values?.name}
          error={errors.name}
        />
        <TextField
          id="instructor"
          name="instructor"
          label="Instructor"
          required
          defaultValue={values?.instructor}
          error={errors.instructor}
        />
        <TextField
          id="startDate"
          name="startDate"
          type="date"
          label="Starts"
          required
          defaultValue={values?.startDate}
          error={errors.startDate}
        />
        <TextField
          id="endDate"
          name="endDate"
          type="date"
          label="Ends"
          required
          defaultValue={values?.endDate}
          error={errors.endDate}
        />
      </div>
      <div className="sm:max-w-xs">
        <Submit pendingLabel="Creating…">Create class</Submit>
      </div>
    </form>
  );
}

export function EnrollCandidatesForm({
  classId,
  candidates,
}: {
  classId: string;
  candidates: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(enrollCandidates.bind(null, classId), idle);
  if (candidates.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Every candidate in class is already enrolled. Add candidates on the Candidates page.
      </p>
    );
  }

  return (
    <form key={state.attempt ?? "empty"} action={action} className="grid gap-3">
      <FormSuccess>{state.done}</FormSuccess>
      <CheckboxGroupField
        id="candidateIds"
        name="candidateIds"
        label="Candidates to add"
        options={candidates.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
        error={state.fieldErrors?.candidateIds}
      />
      <div className="sm:max-w-xs">
        <Submit pendingLabel="Adding…">Add to class</Submit>
      </div>
    </form>
  );
}
