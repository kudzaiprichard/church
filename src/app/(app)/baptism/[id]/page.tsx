import { ArrowLeftIcon, AwardIcon, PrinterIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/auth/dal";
import { getRecord } from "@/lib/data/baptism";
import { formatDateOnly, harareToday } from "@/lib/dates";

import { PageHeader, Panel } from "../../_components/page-parts";
import { issueCertificate } from "../actions";
import { RecordForm } from "../baptism-forms";
import { CertificateBadge } from "../baptism-parts";

export const metadata: Metadata = { title: "Baptismal record" };

const issuedOn = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Harare",
});

/** One baptismal record: edit it, issue its certificate, print it. */
export default async function BaptismRecordPage(props: PageProps<"/baptism/[id]">) {
  const user = await requirePermission("baptism.manage");
  const { id } = await props.params;
  const record = await getRecord(user, id);
  if (!record) notFound();

  return (
    <>
      <Link
        href="/baptism"
        className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        Baptism records
      </Link>
      <PageHeader
        eyebrow={`Baptized ${formatDateOnly(record.baptismDate)}`}
        title={record.member.name}
        description={
          <Link href={`/members/${record.member.id}`} className="text-primary hover:underline">
            Member record
          </Link>
        }
      />

      <div className="grid max-w-3xl gap-4">
        <Panel title="Certificate" action={<CertificateBadge number={record.certificateNumber} />}>
          {record.certificateNumber ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                <span className="numeric text-foreground font-semibold">{record.certificateNumber}</span>
                <span className="text-muted-foreground block text-xs">
                  Issued {issuedOn.format(new Date(record.certificateIssuedAt!))} by{" "}
                  {record.certificateIssuedBy}
                </span>
              </p>
              <Link
                href={`/baptism/${record.id}/certificate`}
                className="border-border hover:bg-muted inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold"
              >
                <PrinterIcon className="size-4" aria-hidden />
                Print certificate
              </Link>
            </div>
          ) : (
            <form
              action={issueCertificate.bind(null, record.id)}
              className="flex flex-wrap items-center gap-3"
            >
              <p className="text-muted-foreground flex-1 text-sm">
                Issuing assigns the next certificate number for this year and tells the member.
              </p>
              <button
                type="submit"
                className="action-solid inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-semibold"
              >
                <AwardIcon className="size-4" aria-hidden />
                Issue certificate
              </button>
            </form>
          )}
        </Panel>

        <Panel title="Record">
          <RecordForm record={record} today={harareToday()} />
        </Panel>
      </div>
    </>
  );
}
