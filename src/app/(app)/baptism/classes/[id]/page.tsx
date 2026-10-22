import { ArrowLeftIcon, UsersRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/auth/dal";
import { getClass } from "@/lib/data/baptism";
import { formatDateOnly, harareToday } from "@/lib/dates";

import { EmptyState, PageHeader, Panel } from "../../../_components/page-parts";
import { closeClass, markCompleted, removeEnrollment } from "../../actions";
import { EnrollCandidatesForm } from "../../baptism-forms";
import { CandidateBadge, CertificateBadge, ClassBadge } from "../../baptism-parts";

export const metadata: Metadata = { title: "Baptismal class" };

/**
 * One class: its enrollees, each marked complete on a date, with their
 * baptism and certificate once they are enrolled as members.
 */
export default async function ClassPage(props: PageProps<"/baptism/classes/[id]">) {
  const user = await requirePermission("baptism.manage");
  const { id } = await props.params;
  const klass = await getClass(user, id);
  if (!klass) notFound();
  const today = harareToday();

  return (
    <>
      <Link
        href="/baptism/classes"
        className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        Classes
      </Link>
      <PageHeader
        eyebrow={`${formatDateOnly(klass.startDate)} to ${formatDateOnly(klass.endDate)}`}
        title={klass.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Taught by {klass.instructor} <ClassBadge status={klass.status} />
          </span>
        }
        actions={
          !klass.completedAt && (
            <form action={closeClass.bind(null, klass.id)}>
              <button
                type="submit"
                className="border-border bg-card hover:bg-muted h-9 cursor-pointer rounded-md border px-3.5 text-sm font-semibold"
              >
                Close class
              </button>
            </form>
          )
        }
      />

      <div className="grid max-w-4xl gap-4">
        <Panel title={`${klass.enrollees.length} enrolled`} bodyClassName="p-0">
          {klass.enrollees.length === 0 ? (
            <EmptyState icon={<UsersRoundIcon className="size-5" aria-hidden />} title="Nobody yet" />
          ) : (
            <ul className="divide-border divide-y">
              {klass.enrollees.map((entry) => (
                <li
                  key={entry.enrollmentId}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground text-sm font-semibold">{entry.candidate.name}</span>
                      <CandidateBadge status={entry.candidate.status} />
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {entry.completedOn
                        ? `Completed ${formatDateOnly(entry.completedOn)}`
                        : "Not completed yet"}
                      {entry.baptism && <> · baptized {formatDateOnly(entry.baptism.date)}</>}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {entry.baptism && (
                      <Link
                        href={`/baptism/${entry.baptism.recordId}`}
                        className="inline-flex items-center gap-1.5 text-xs"
                      >
                        <CertificateBadge number={entry.baptism.certificateNumber} />
                      </Link>
                    )}
                    {!entry.completedOn && (
                      <form
                        action={markCompleted.bind(null, entry.enrollmentId)}
                        className="flex items-center gap-1.5"
                      >
                        <label className="sr-only" htmlFor={`done-${entry.enrollmentId}`}>
                          Completed on
                        </label>
                        <input
                          id={`done-${entry.enrollmentId}`}
                          type="date"
                          name="completedOn"
                          defaultValue={today}
                          max={today}
                          className="border-input bg-background h-7 rounded-md border px-1.5 text-xs"
                        />
                        <button type="submit" className={small}>
                          Mark completed
                        </button>
                      </form>
                    )}
                    {!entry.completedOn && (
                      <form action={removeEnrollment.bind(null, entry.enrollmentId)}>
                        <button type="submit" className={`${small} text-destructive`}>
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Add candidates">
          <EnrollCandidatesForm classId={klass.id} candidates={klass.available} />
        </Panel>
      </div>
    </>
  );
}

const small =
  "border-border hover:bg-muted h-7 cursor-pointer rounded-md border px-2.5 text-xs font-medium transition-colors";
