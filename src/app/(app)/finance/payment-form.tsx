"use client";

import { PlusIcon } from "lucide-react";
import { useActionState, useState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PaymentOptions } from "@/lib/data/finance";
import { expectedChema, MONTHS } from "@/lib/finance/chema";
import { formatMoney } from "@/lib/finance/money";
import { TYPE_LABELS, TYPES } from "@/lib/finance/totals";

import { FormSuccess, SelectField, TextAreaField, TextField } from "../_components/form-fields";

import { logPayment, recordForMember } from "./actions";
import { financeIdleState } from "./form-state";

type Type = (typeof TYPES)[number];

/**
 * One payment: a member logging their own (PENDING), or — with `members` — an
 * officer recording one handed in (CONFIRMED). The chema amount is shown, not
 * asked: it is what the month costs, and the server sets it.
 */
export function PaymentForm({
  options,
  today,
  members,
}: {
  options: PaymentOptions;
  today: string;
  members?: { id: string; name: string; detail: string }[];
}) {
  const [state, action] = useActionState(members ? recordForMember : logPayment, financeIdleState);
  const values = state.values;
  const [type, setType] = useState<Type>((values?.type as Type | undefined) ?? "CHEMA");
  const [chemaMonth, setChemaMonth] = useState(
    values?.chemaMonth ?? String(Number(today.slice(5, 7))),
  );
  const errors = state.fieldErrors ?? {};
  const year = Number(today.slice(0, 4));

  return (
    <form key={state.attempt ?? "empty"} action={action} className="grid gap-4" noValidate>
      <FormError>{state.error}</FormError>
      <FormSuccess>{state.done}</FormSuccess>

      {members && (
        <SelectField
          id="memberId"
          name="memberId"
          label="Member"
          required
          placeholder="Choose a member"
          options={members.map((member) => ({
            value: member.id,
            label: `${member.name} — ${member.detail}`,
          }))}
          defaultValue={values?.memberId}
          error={errors.memberId}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className="text-foreground text-sm font-medium">
            Type
          </label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as Type)}
            className="border-input bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm"
          >
            {TYPES.map((value) => (
              <option key={value} value={value}>
                {TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <TextField
          id="paidAt"
          name="paidAt"
          type="date"
          label="Date paid"
          required
          max={today}
          defaultValue={values?.paidAt ?? today}
          error={errors.paidAt}
        />
      </div>

      {type === "CHEMA" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="chemaMonth" className="text-foreground text-sm font-medium">
              Month it pays for
            </label>
            <div className="mt-1.5 flex gap-2">
              <select
                id="chemaMonth"
                name="chemaMonth"
                value={chemaMonth}
                onChange={(event) => setChemaMonth(event.target.value)}
                aria-invalid={errors.chemaMonth ? true : undefined}
                className="border-input bg-background h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm"
              >
                {MONTHS.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Year"
                name="chemaYear"
                defaultValue={values?.chemaYear ?? String(year)}
                className="border-input bg-background h-10 rounded-lg border px-3 text-sm"
              >
                {[year - 1, year, year + 1].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            {errors.chemaMonth && (
              <p className="text-destructive mt-1.5 text-xs">{errors.chemaMonth}</p>
            )}
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">Amount</p>
            <p className="numeric text-foreground mt-1.5 flex h-10 items-center text-sm font-semibold">
              {formatMoney(expectedChema(Number(chemaMonth)))}
            </p>
            <p className="text-muted-foreground text-xs">$5 in January, $1 in other months.</p>
          </div>
        </div>
      ) : (
        <TextField
          id="amount"
          name="amount"
          label="Amount (USD)"
          required
          inputMode="text"
          defaultValue={values?.amount}
          error={errors.amount}
          hint="For example 25 or 12.50."
        />
      )}

      {type === "PARTNERSHIP" && (
        <SelectField
          id="projectId"
          name="projectId"
          label="Project"
          required
          placeholder="Choose a project"
          options={options.projects.map((project) => ({ value: project.id, label: project.name }))}
          defaultValue={values?.projectId}
          error={errors.projectId}
        />
      )}

      {type !== "CHEMA" && options.pledges.length > 0 && (
        <SelectField
          id="pledgeId"
          name="pledgeId"
          label="Count toward a pledge"
          placeholder="No pledge"
          options={options.pledges.map((pledge) => ({
            value: pledge.id,
            label: pledge.description,
          }))}
          defaultValue={values?.pledgeId}
          error={errors.pledgeId}
        />
      )}

      <TextAreaField
        id="note"
        name="note"
        label="Note"
        rows={2}
        defaultValue={values?.note}
        error={errors.note}
        hint={members ? "For example how it was handed in." : "For example how you paid."}
      />

      <div className="sm:max-w-xs">
        <Submit pendingLabel="Saving…">{members ? "Record payment" : "Log payment"}</Submit>
      </div>
    </form>
  );
}

/** The "Log payment" button and its dialog on /finance. */
export function LogPaymentDialog({ options, today }: { options: PaymentOptions; today: string }) {
  return (
    <Dialog>
      <DialogTrigger className="action-solid inline-flex h-9 cursor-pointer items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none">
        <PlusIcon className="size-4" aria-hidden />
        Log payment
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a payment</DialogTitle>
          <DialogDescription>
            It counts once the church office confirms it — until then it shows as pending.
          </DialogDescription>
        </DialogHeader>
        <PaymentForm options={options} today={today} />
      </DialogContent>
    </Dialog>
  );
}
