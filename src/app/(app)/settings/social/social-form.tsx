"use client";

import { useActionState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";
import type { SocialPlatform } from "@/generated/prisma/enums";

import { FormSuccess, TextField } from "../../_components/form-fields";
import { updateSocialLinks } from "../actions";
import { settingsIdleState } from "../form-state";

export type SocialRow = {
  platform: SocialPlatform;
  name: string;
  hint: string;
  handle: string;
  url: string;
  isVisible: boolean;
};

/** All four platforms, saved together. */
export function SocialForm({ rows }: { rows: SocialRow[] }) {
  const [state, action] = useActionState(updateSocialLinks, settingsIdleState);
  const errors = state.fieldErrors ?? {};
  // After a failure, what was typed — an unticked box posts nothing at all.
  const value = (row: SocialRow, field: "handle" | "url") =>
    state.values ? (state.values[`${row.platform}.${field}`] ?? "") : row[field];
  const visible = (row: SocialRow) =>
    state.values ? state.values[`${row.platform}.isVisible`] === "on" : row.isVisible;

  return (
    <form key={state.attempt ?? "stored"} action={action} className="grid gap-5" noValidate>
      <FormError>{state.error}</FormError>
      {state.done && (
        <FormSuccess>Saved. The website shows them from the next page load.</FormSuccess>
      )}

      <ul className="divide-border grid divide-y">
        {rows.map((row) => (
          <li key={row.platform} className="grid gap-3 py-4 first:pt-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-foreground text-sm font-bold">{row.name}</h3>
              <label className="text-foreground/85 inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`${row.platform}.isVisible`}
                  defaultChecked={visible(row)}
                  className="accent-primary size-4"
                />
                Show on the website
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
              <TextField
                id={`${row.platform}-handle`}
                name={`${row.platform}.handle`}
                label="Handle"
                defaultValue={value(row, "handle")}
                error={errors[`${row.platform}.handle`]}
              />
              <TextField
                id={`${row.platform}-url`}
                name={`${row.platform}.url`}
                type="url"
                inputMode="url"
                label="Link"
                defaultValue={value(row, "url")}
                error={errors[`${row.platform}.url`]}
                hint={row.hint}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="sm:max-w-xs">
        <Submit pendingLabel="Saving…">Save social links</Submit>
      </div>
    </form>
  );
}
