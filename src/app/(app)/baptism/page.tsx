import { DropletsIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requirePermission } from "@/lib/auth/dal";
import { listRecords } from "@/lib/data/baptism";
import { formatDateOnly, harareToday } from "@/lib/dates";

import { EmptyState, PageHeader, Panel } from "../_components/page-parts";

import { BaptismTabs, CertificateBadge } from "./baptism-parts";

export const metadata: Metadata = { title: "Baptism records" };

/**
 * Baptismal records (docs/SCOPE.md §9.16) — one per enrolled member, made at
 * enrolment. For the Matron and the Apostles; filter by certificate status and
 * year.
 */
export default async function BaptismRecordsPage(props: PageProps<"/baptism">) {
  const user = await requirePermission("baptism.manage");
  const params = await props.searchParams;
  const certificate =
    params.certificate === "pending" || params.certificate === "issued"
      ? params.certificate
      : undefined;
  const thisYear = Number(harareToday().slice(0, 4));
  const year = Number(params.year) || undefined;

  const records = (await listRecords(user, { certificate, year }))!;
  const control = "border-input bg-background h-9 rounded-lg border px-2 text-sm";

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Baptism"
        description="Baptismal records, certificates, candidates and classes."
      />
      <BaptismTabs active="records" />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold">
          Certificate
          <select
            name="certificate"
            defaultValue={certificate ?? ""}
            className={`${control} mt-1 block`}
          >
            <option value="">Any</option>
            <option value="pending">Pending</option>
            <option value="issued">Issued</option>
          </select>
        </label>
        <label className="text-xs font-semibold">
          Baptized in
          <select name="year" defaultValue={year ?? ""} className={`${control} mt-1 block`}>
            <option value="">Any year</option>
            {Array.from({ length: 10 }, (_, index) => thisYear - index).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="action-solid h-9 cursor-pointer rounded-lg px-4 text-sm font-semibold"
        >
          Filter
        </button>
      </form>

      <Panel bodyClassName="p-0">
        {records.length === 0 ? (
          <EmptyState icon={<DropletsIcon className="size-5" aria-hidden />} title="No records match">
            Records are created when a member is enrolled.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border text-muted-foreground border-b text-xs">
                  <th scope="col" className="px-5 py-2 text-left font-semibold">
                    Member
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">
                    Baptized
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">
                    Conducted by
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">
                    Class completed
                  </th>
                  <th scope="col" className="px-5 py-2 text-left font-semibold">
                    Certificate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/baptism/${record.id}`}
                        className="text-foreground font-medium hover:underline"
                      >
                        {record.member.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      {formatDateOnly(record.baptismDate)}
                      <span className="text-muted-foreground block text-xs">{record.location}</span>
                    </td>
                    <td className="px-3 py-2.5">{record.conductedBy}</td>
                    <td className="text-muted-foreground px-3 py-2.5">
                      {record.classCompletedOn ? formatDateOnly(record.classCompletedOn) : "—"}
                    </td>
                    <td className="px-5 py-2.5">
                      <CertificateBadge number={record.certificateNumber} />
                      {record.certificateNumber && (
                        <span className="text-muted-foreground numeric block text-xs">
                          {record.certificateNumber}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
