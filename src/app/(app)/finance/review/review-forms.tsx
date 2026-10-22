"use client";

import { useActionState, useState } from "react";

import { FormError } from "@/app/(auth)/_components/form-parts";

import { FormSuccess } from "../../_components/form-fields";
import { confirmSelected, rejectContribution, reverseContribution } from "../actions";
import { financeIdleState } from "../form-state";

const small =
  "h-7 cursor-pointer rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none";

/**
 * The bulk-confirm form. Its checkboxes live in the table rows and join it
 * through the `form` attribute, so each row can also carry its own confirm
 * and reject forms without nesting one form in another.
 */
export function BulkConfirm({ formId, count }: { formId: string; count: number }) {
  const [state, action] = useActionState(confirmSelected, financeIdleState);

  return (
    <form id={formId} action={action} className="flex flex-wrap items-center gap-3">
      <FormError>{state.error}</FormError>
      <FormSuccess>{state.done}</FormSuccess>
      <button
        type="button"
        onClick={() =>
          document
            .querySelectorAll<HTMLInputElement>(`input[form="${formId}"][name="ids"]`)
            .forEach((input) => {
              input.checked = true;
            })
        }
        className={`${small} border-border hover:bg-muted`}
      >
        Select all {count}
      </button>
      <button type="submit" className={`${small} action-solid border-transparent`}>
        Confirm selected
      </button>
    </form>
  );
}

/** Reject, with the reason the member will read. Opens in place. */
export function RejectForm({ id }: { id: string }) {
  const [state, action] = useActionState(rejectContribution.bind(null, id), financeIdleState);
  const [open, setOpen] = useState(Boolean(state.fieldErrors));

  if (!open && !state.fieldErrors) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${small} border-destructive/25 text-destructive hover:bg-destructive/10`}
      >
        Reject
      </button>
    );
  }

  return (
    <form action={action} className="grid gap-1.5 text-left">
      <FormError>{state.error}</FormError>
      <label htmlFor={`reason-${id}`} className="sr-only">
        Reason
      </label>
      <input
        id={`reason-${id}`}
        name="reason"
        placeholder="Reason the member will see"
        defaultValue={state.values?.reason}
        className="border-input bg-background h-8 w-56 rounded-md border px-2 text-xs"
      />
      {state.fieldErrors?.reason && (
        <p className="text-destructive text-xs">{state.fieldErrors.reason}</p>
      )}
      <div className="flex gap-1.5">
        <button
          type="submit"
          className={`${small} border-destructive/25 text-destructive hover:bg-destructive/10`}
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={`${small} border-border hover:bg-muted`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Reverse a confirmed payment with a reason — an officer's correction. */
export function ReverseForm({ id }: { id: string }) {
  const [state, action] = useActionState(reverseContribution.bind(null, id), financeIdleState);
  const [open, setOpen] = useState(false);

  if (state.done) return <span className="text-muted-foreground text-xs">{state.done}</span>;
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${small} border-border hover:bg-muted`}
      >
        Reverse
      </button>
    );
  }

  return (
    <form action={action} className="grid gap-1.5 text-left">
      <FormError>{state.error}</FormError>
      <label htmlFor={`note-${id}`} className="sr-only">
        Why it is being reversed
      </label>
      <input
        id={`note-${id}`}
        name="note"
        placeholder="Why it is being reversed"
        defaultValue={state.values?.note}
        className="border-input bg-background h-8 w-56 rounded-md border px-2 text-xs"
      />
      {state.fieldErrors?.note && <p className="text-destructive text-xs">{state.fieldErrors.note}</p>}
      <div className="flex gap-1.5">
        <button
          type="submit"
          className={`${small} border-destructive/25 text-destructive hover:bg-destructive/10`}
        >
          Record reversal
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={`${small} border-border hover:bg-muted`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
