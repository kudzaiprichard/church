import { GraduationCapIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requirePermission } from "@/lib/auth/dal";
import { listClasses } from "@/lib/data/baptism";
import { formatDateOnly } from "@/lib/dates";
import { paginate, parsePaging } from "@/lib/paging";

import { EmptyState, PageHeader, Panel } from "../../_components/page-parts";
import { ClassForm } from "../baptism-forms";
import { BaptismTabs, ClassBadge } from "../baptism-parts";
import { Pagination } from "../../_components/pagination";

export const metadata: Metadata = { title: "Baptismal classes" };

/** Baptismal classes (docs/SCOPE.md §9.16), with status derived from their dates. */
export default async function ClassesPage(props: PageProps<"/baptism/classes">) {
  const user = await requirePermission("baptism.manage");
  const all = (await listClasses(user))!;
  const classes = paginate(all, parsePaging(await props.searchParams, 20));

  return (
    <>
      <PageHeader eyebrow="People" title="Baptism" description="Baptismal classes." />
      <BaptismTabs active="classes" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <Panel title={`${classes.total} classes`} bodyClassName="p-0">
          {classes.total === 0 ? (
            <EmptyState
              icon={<GraduationCapIcon className="size-5" aria-hidden />}
              title="No classes yet"
            />
          ) : (
            <>
              <ul className="divide-border divide-y">
                {classes.rows.map((klass) => (
                  <li key={klass.id}>
                    <Link
                      href={`/baptism/classes/${klass.id}`}
                      className="hover:bg-muted/60 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <span className="min-w-0">
                        <span className="text-foreground block text-sm font-semibold">
                          {klass.name}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {klass.instructor} · {formatDateOnly(klass.startDate)} to{" "}
                          {formatDateOnly(klass.endDate)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground numeric">
                          {klass.completed} of {klass.enrolled} completed
                        </span>
                        <ClassBadge status={klass.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Pagination
                page={classes.page}
                pageCount={classes.pageCount}
                total={classes.total}
                size={classes.size}
                pathname="/baptism/classes"
                params={{}}
              />
            </>
          )}
        </Panel>

        <Panel title="New class">
          <ClassForm />
        </Panel>
      </div>
    </>
  );
}
