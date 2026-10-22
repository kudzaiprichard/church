import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { requirePermission } from "@/lib/auth/dal";
import { getRecord } from "@/lib/data/baptism";
import { formatDateOnly } from "@/lib/dates";
import { getChurchInfo } from "@/lib/settings";

import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Baptism certificate" };

/**
 * The printable certificate (docs/SCOPE.md §9.16): A4, with the member's
 * name, the date and place, the officiant, the number and the church. The
 * `print-area` class (globals.css) hides the portal's chrome when printing.
 */
export default async function CertificatePage(props: PageProps<"/baptism/[id]/certificate">) {
  const user = await requirePermission("baptism.manage");
  const { id } = await props.params;
  const [record, church] = await Promise.all([getRecord(user, id), getChurchInfo()]);
  if (!record || !record.certificateNumber) notFound();

  return (
    <>
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <article className="print-area bg-card border-brass/60 mx-auto aspect-[210/297] w-full max-w-2xl border-4 border-double p-10 text-center sm:p-14">
        <Logo size={72} className="mx-auto" />
        <p className="text-accent-foreground mt-6 text-xs font-semibold tracking-[0.3em] uppercase">
          {church.name}
        </p>
        <h1 className="text-navy mt-8 font-serif text-4xl font-bold">Certificate of Baptism</h1>
        <p className="text-muted-foreground mt-8 text-sm">This is to certify that</p>
        <p className="text-foreground mt-3 font-serif text-3xl font-semibold">{record.member.name}</p>
        <p className="text-muted-foreground mx-auto mt-6 max-w-md text-sm leading-relaxed">
          was baptized in the name of the Father, and of the Son, and of the Holy Spirit on{" "}
          <span className="text-foreground font-semibold">{formatDateOnly(record.baptismDate)}</span>{" "}
          at <span className="text-foreground font-semibold">{record.location}</span>.
        </p>
        <div className="mt-14 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="border-foreground/40 text-foreground border-t pt-2 font-semibold">
              {record.conductedBy}
            </p>
            <p className="text-muted-foreground text-xs">Officiating minister</p>
          </div>
          <div>
            <p className="border-foreground/40 text-foreground numeric border-t pt-2 font-semibold">
              {record.certificateNumber}
            </p>
            <p className="text-muted-foreground text-xs">Certificate number</p>
          </div>
        </div>
      </article>
    </>
  );
}
