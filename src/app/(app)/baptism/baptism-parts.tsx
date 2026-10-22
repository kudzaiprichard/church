import Link from "next/link";

import type { CandidateStatus } from "@/generated/prisma/enums";
import type { ClassStatus } from "@/lib/baptism/rules";
import { cn } from "@/lib/utils";

import { Badge } from "../finance/finance-parts";

/** Records · Candidates · Classes. */
export function BaptismTabs({ active }: { active: "records" | "candidates" | "classes" }) {
  const tabs = [
    { id: "records", label: "Records", href: "/baptism" },
    { id: "candidates", label: "Candidates", href: "/baptism/candidates" },
    { id: "classes", label: "Classes", href: "/baptism/classes" },
  ] as const;

  return (
    <nav aria-label="Baptism" className="border-border mb-4 flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === active ? "page" : undefined}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
            tab.id === active
              ? "border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground border-transparent",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function CertificateBadge({ number }: { number: string | null }) {
  return number ? <Badge tone="blue">Issued</Badge> : <Badge tone="amber">Pending</Badge>;
}

export function CandidateBadge({ status }: { status: CandidateStatus }) {
  if (status === "BAPTIZED") return <Badge tone="green">Baptized</Badge>;
  if (status === "WITHDRAWN") return <Badge tone="grey">Withdrawn</Badge>;
  return <Badge tone="blue">In class</Badge>;
}

export function ClassBadge({ status }: { status: ClassStatus }) {
  if (status === "COMPLETED") return <Badge tone="green">Completed</Badge>;
  if (status === "ONGOING") return <Badge tone="blue">Ongoing</Badge>;
  return <Badge tone="grey">Upcoming</Badge>;
}
