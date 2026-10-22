import { UserPlusIcon, UsersRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requirePermission } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { listCandidates } from "@/lib/data/baptism";
import { paginate, parsePaging } from "@/lib/paging";

import { EmptyState, PageHeader, Panel } from "../../_components/page-parts";
import { setCandidateStatus } from "../actions";
import { CandidateForm } from "../baptism-forms";
import { BaptismTabs, CandidateBadge } from "../baptism-parts";
import { Pagination } from "../../_components/pagination";

export const metadata: Metadata = { title: "Baptism candidates" };

/**
 * People preparing for baptism (docs/SCOPE.md §9.16, §11 Q4) — not portal
 * users. "Enrol as member" opens the enrolment form pre-filled and links the
 * candidate to the new member when it is saved.
 */
export default async function CandidatesPage(props: PageProps<"/baptism/candidates">) {
  const user = await requirePermission("baptism.manage");
  const all = (await listCandidates(user))!;
  const candidates = paginate(all, parsePaging(await props.searchParams, 20));
  const enrols = can(user, "members.enroll");

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Baptism"
        description="Candidates preparing for baptism."
      />
      <BaptismTabs active="candidates" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <Panel title={`${candidates.total} candidates`} bodyClassName="p-0">
          {candidates.total === 0 ? (
            <EmptyState
              icon={<UsersRoundIcon className="size-5" aria-hidden />}
              title="No candidates yet"
            />
          ) : (
            <>
              <ul className="divide-border divide-y">
                {candidates.rows.map((candidate) => (
                  <li
                    key={candidate.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-foreground text-sm font-semibold">
                          {candidate.firstName} {candidate.lastName}
                        </span>
                        <CandidateBadge status={candidate.status} />
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {[candidate.phone, candidate.email].filter(Boolean).join(" · ") ||
                          "No contact details"}
                      </p>
                      {candidate.classes.length > 0 && (
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {candidate.classes
                            .map(
                              (klass) => `${klass.name}${klass.completedOn ? " (completed)" : ""}`,
                            )
                            .join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.member ? (
                        <Link href={`/members/${candidate.member.id}`} className={small}>
                          Member record
                        </Link>
                      ) : (
                        <>
                          {enrols && candidate.status !== "WITHDRAWN" && (
                            <Link
                              href={`/members/new?candidate=${candidate.id}`}
                              className={`${small} gap-1`}
                            >
                              <UserPlusIcon className="size-3.5" aria-hidden />
                              Enrol as member
                            </Link>
                          )}
                          <form
                            action={setCandidateStatus.bind(
                              null,
                              candidate.id,
                              candidate.status === "WITHDRAWN" ? "IN_CLASS" : "WITHDRAWN",
                            )}
                          >
                            <button type="submit" className={`${small} cursor-pointer`}>
                              {candidate.status === "WITHDRAWN" ? "Back in class" : "Withdraw"}
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination
                page={candidates.page}
                pageCount={candidates.pageCount}
                total={candidates.total}
                size={candidates.size}
                pathname="/baptism/candidates"
                params={{}}
              />
            </>
          )}
        </Panel>

        <Panel title="Add a candidate">
          <CandidateForm />
        </Panel>
      </div>
    </>
  );
}

const small =
  "border-border hover:bg-muted inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors";
