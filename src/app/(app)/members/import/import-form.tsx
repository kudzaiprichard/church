"use client";

import { FileUpIcon, MailIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { FormError } from "@/app/(auth)/_components/form-parts";
import { cellText, encodeCsv, XLSX_MAX_BYTES } from "@/lib/members/import";

import { FormSuccess } from "../../_components/form-fields";
import { Panel } from "../../_components/page-parts";
import {
  checkMemberImport,
  commitMemberImport,
  sendPendingInvitations,
  type ImportCheck,
} from "./actions";

/** How many ready rows the preview lists before summarising the rest. */
const PREVIEW_ROWS = 100;

const button =
  "action-solid inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-55";

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * The file's rows as CSV text. An Excel workbook is read here, in the
 * browser — its first sheet only — so the server only ever receives text and
 * holds a CSV and a workbook to exactly the same rules.
 */
async function readAsCsv(file: File): Promise<string> {
  if (!/\.xlsx$/i.test(file.name)) {
    if (/\.xls$/i.test(file.name)) {
      throw new Error("That is an older Excel file (.xls). Open it in Excel and save it as .xlsx.");
    }
    return file.text();
  }
  if (file.size > XLSX_MAX_BYTES) throw new Error("That workbook is over 5 MB.");
  const { readSheet } = await import("read-excel-file/browser");
  let rows: unknown[][];
  try {
    rows = await readSheet(file);
  } catch {
    throw new Error("That workbook could not be read. Save it again as .xlsx, or as CSV.");
  }
  return encodeCsv(rows.map((row) => row.map(cellText)));
}

/** The check as a CSV the person can keep beside their spreadsheet, built in the browser. */
function downloadReport(check: ImportCheck) {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = [
    ["line", "email", "status", "problems"],
    ...check.ready.map((row) => [row.line, row.email, "ready", ""]),
    ...check.problems.map((row) => [row.line, row.email ?? "", "skipped", row.errors.join("; ")]),
  ];
  const blob = new Blob(["﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${check.fileName.replace(/\.(csv|xlsx)$/i, "")}-check.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function ImportForm({ notYetInvited: initialPending }: { notYetInvited: number }) {
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  // Bumped to clear the file input once its rows are in.
  const [inputKey, setInputKey] = useState(0);
  const [check, setCheck] = useState<ImportCheck | null>(null);
  const [error, setError] = useState<string>();
  const [enrolled, setEnrolled] = useState<number | null>(null);
  const [pendingInvites, setPendingInvites] = useState(initialPending);
  const [inviteNote, setInviteNote] = useState<string>();
  const [inviteError, setInviteError] = useState<string>();
  const [working, startWork] = useTransition();
  const [inviting, startInvites] = useTransition();

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    setCheck(null);
    setError(undefined);
    setEnrolled(null);
    setFile(null);
    if (!chosen) return;
    try {
      setFile({ name: chosen.name, text: await readAsCsv(chosen) });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That file could not be read.");
    }
  }

  function runCheck() {
    if (!file) return;
    startWork(async () => {
      const result = await checkMemberImport(file.name, file.text);
      if ("error" in result) {
        setError(result.error);
        setCheck(null);
      } else {
        setError(undefined);
        setCheck(result.check);
      }
    });
  }

  function runImport() {
    if (!file || !check) return;
    startWork(async () => {
      const result = await commitMemberImport(file.name, file.text, check.ready.length);
      if ("error" in result) {
        setError(result.error);
        if (result.check) setCheck(result.check);
        return;
      }
      setError(undefined);
      setEnrolled(result.enrolled);
      setPendingInvites(result.notYetInvited);
      setCheck(null);
      setFile(null);
      setInputKey((key) => key + 1);
    });
  }

  function runInvites() {
    startInvites(async () => {
      const result = await sendPendingInvitations();
      setPendingInvites(result.remaining);
      setInviteError(result.error);
      setInviteNote(
        `Sent ${plural(result.sent, "invitation")}.` +
          (result.remaining > 0 && !result.error
            ? ` ${result.remaining} still to send — send the next batch.`
            : ""),
      );
    });
  }

  return (
    <>
      <Panel
        title="2. Check and import"
        description="The check reads every row against the same rules as enrolling one person, and saves nothing."
      >
        <div className="grid gap-4">
          <FormError>{error}</FormError>
          {enrolled !== null && (
            <FormSuccess>
              Enrolled {plural(enrolled, "member")}. They are on the{" "}
              <Link href="/members" className="font-semibold underline">
                roll
              </Link>{" "}
              now; their invitations are the next step.
            </FormSuccess>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-medium">
              Spreadsheet (.xlsx or .csv)
              <input
                key={inputKey}
                type="file"
                accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={choose}
                className="border-input bg-background file:bg-secondary file:text-primary h-10 w-full min-w-0 rounded-lg border text-sm file:mr-3 file:h-full file:cursor-pointer file:border-0 file:px-3 file:font-semibold focus:border-[var(--ring)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)] focus:outline-none"
              />
            </label>
            <button type="button" onClick={runCheck} disabled={!file || working} className={button}>
              <FileUpIcon className="size-4" aria-hidden />
              {working && !check ? "Checking…" : "Check file"}
            </button>
          </div>

          {check && (
            <div className="grid gap-4" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  <strong>{plural(check.ready.length, "row")} ready</strong>
                  {check.problems.length > 0 && (
                    <>
                      ,{" "}
                      <strong className="text-destructive">
                        {check.problems.length} with problems
                      </strong>{" "}
                      (skipped unless fixed)
                    </>
                  )}
                  .
                </p>
                <button
                  type="button"
                  onClick={() => downloadReport(check)}
                  className="text-primary min-h-6 cursor-pointer rounded-sm text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                >
                  Download the check
                </button>
              </div>

              {check.unknownColumns.length > 0 && (
                <p className="bg-accent text-accent-foreground rounded-lg px-3.5 py-3 text-sm">
                  Ignored columns: {check.unknownColumns.join(", ")}. If one is a typo of a template
                  column, fix the heading and check again.
                </p>
              )}

              {check.problems.length > 0 && (
                <ResultTable
                  caption="Rows with problems"
                  head={["Line", "Email", "What to fix"]}
                  rows={check.problems.map((row) => [
                    row.line,
                    row.email ?? "—",
                    row.errors.join(" "),
                  ])}
                />
              )}

              {check.ready.length > 0 && (
                <ResultTable
                  caption="Ready to enrol"
                  head={["Line", "Name", "Email", "Groups"]}
                  rows={check.ready
                    .slice(0, PREVIEW_ROWS)
                    .map((row) => [row.line, row.name, row.email, row.groups.join(", ")])}
                  more={check.ready.length - PREVIEW_ROWS}
                />
              )}

              {check.ready.length > 0 && (
                <div className="border-border grid gap-3 border-t pt-4">
                  <p className="text-muted-foreground text-sm text-pretty">
                    Importing enrols {plural(check.ready.length, "member")} as Members, each with
                    their baptismal record and groups, and records it in the audit log. It cannot be
                    undone in one step. No emails are sent yet.
                  </p>
                  <div>
                    <button type="button" onClick={runImport} disabled={working} className={button}>
                      {working ? "Importing…" : `Import ${plural(check.ready.length, "member")}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Panel>

      <Panel
        title="3. Send invitations"
        description="Every imported member who has not had one gets an email with a link to choose their own password. Sent in batches, at the pace the mail service allows. People enrolled by hand were invited then; use “Resend invitation” on their page."
      >
        <div className="grid gap-4">
          <FormError>{inviteError}</FormError>
          {inviteNote && <FormSuccess>{inviteNote}</FormSuccess>}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={runInvites}
              disabled={pendingInvites === 0 || inviting}
              className={button}
            >
              <MailIcon className="size-4" aria-hidden />
              {inviting ? "Sending… (this takes a minute)" : "Send invitations"}
            </button>
            <p className="text-muted-foreground text-sm">
              {pendingInvites === 0
                ? "Every imported member has been invited."
                : `${plural(pendingInvites, "imported member")} not yet invited.`}
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}

function ResultTable({
  caption,
  head,
  rows,
  more = 0,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
  more?: number;
}) {
  return (
    <div className="border-border overflow-x-auto overflow-y-hidden rounded-lg border">
      <table className="w-full text-left text-sm">
        <caption className="text-foreground px-3 py-2 text-left text-xs font-bold">
          {caption}
        </caption>
        <thead className="bg-muted text-muted-foreground text-xs">
          <tr>
            {head.map((cell) => (
              <th key={cell} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-border border-t align-top">
              {row.map((cell, index) => (
                <td key={index} className={index === 0 ? "numeric px-3 py-2" : "px-3 py-2"}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {more > 0 && (
        <p className="text-muted-foreground border-border border-t px-3 py-2 text-xs">
          …and {more} more.
        </p>
      )}
    </div>
  );
}
