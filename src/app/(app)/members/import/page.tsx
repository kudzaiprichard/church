import { DownloadIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requirePermission } from "@/lib/auth/dal";
import { groupOptions } from "@/lib/data/members";
import { countNotYetInvited } from "@/lib/members/import-run";

import { PageHeader, Panel } from "../../_components/page-parts";

import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import members" };

/** Sending a batch of invitations takes a minute or two; the actions run under this page. */
export const maxDuration = 300;

const COLUMNS: [string, string][] = [
  ["first_name, last_name, email", "Required. The email must not already be on the roll."],
  ["groups", "Required. One or more connect group names, separated by ; — as listed below."],
  ["baptism_date, baptism_location, conducted_by", "Required — only the baptized are enrolled."],
  ["phone, address, date_of_birth, gender", "Optional. Gender is F or M."],
  ["class_completed_on, notes", "Optional, on the baptismal record."],
];

/**
 * Bringing the church's existing roll into the portal — whoever may enrol,
 * since this is enrolment in bulk (docs/SCOPE.md §9.3). Check, then import,
 * then invite: three separate steps, so nothing is written without the
 * person seeing exactly which rows will be and why the others will not.
 */
export default async function ImportMembersPage() {
  await requirePermission("members.enroll");
  const [groups, notYetInvited] = await Promise.all([groupOptions(), countNotYetInvited()]);

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Import members"
        description="Bring an existing member list in from a spreadsheet. Nothing is saved until you have seen the check and confirmed it."
      />

      <div className="grid max-w-4xl gap-4">
        <Panel
          title="1. Prepare the file"
          description="Fill in the template in Excel or Google Sheets. Upload the Excel workbook as it is (.xlsx, first sheet), or save it as CSV."
          action={
            <Link
              href="/members/import/template"
              prefetch={false}
              className="border-border bg-card hover:bg-muted inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              <DownloadIcon className="size-4" aria-hidden />
              Template
            </Link>
          }
        >
          <dl className="grid gap-3 text-sm">
            {COLUMNS.map(([columns, rule]) => (
              <div
                key={columns}
                className="grid gap-0.5 sm:grid-cols-[minmax(0,18rem)_1fr] sm:gap-4"
              >
                <dt className="font-mono text-xs font-semibold break-words">{columns}</dt>
                <dd className="text-muted-foreground">{rule}</dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground mt-4 text-xs leading-relaxed text-pretty">
            Dates may be written 14/03/2015 or 2015-03-14. The connect groups are:{" "}
            {groups.map((group) => group.name).join(", ")}.
          </p>
        </Panel>

        <ImportForm notYetInvited={notYetInvited} />
      </div>
    </>
  );
}
