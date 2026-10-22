import { recordAudit } from "@/lib/auth/audit";
import { requirePermission } from "@/lib/auth/dal";
import { toCsv } from "@/lib/csv";
import { churchFinance, defaultPeriod } from "@/lib/data/finance";
import { groupOptions } from "@/lib/data/members";
import { harareToday, isDateOnly } from "@/lib/dates";
import { fromCents } from "@/lib/finance/money";

/**
 * The finance CSV (docs/SCOPE.md §9.9): the church page's rows for the same
 * filters, for `finance.export`. Every export is audited with its filters —
 * a file of everyone's giving leaving the system is exactly the act the log
 * exists for. Cells are formula-safe (see `lib/csv.ts`).
 */
export async function GET(request: Request) {
  const user = await requirePermission("finance.export");

  const params = new URL(request.url).searchParams;
  const fallback = defaultPeriod();
  const date = (value: string | null, otherwise: string) =>
    value && isDateOnly(value) ? value : otherwise;
  let from = date(params.get("from"), fallback.from);
  let to = date(params.get("to"), fallback.to);
  if (from > to) [from, to] = [to, from];

  const groups = await groupOptions();
  const group = groups.find((entry) => entry.id === params.get("group"));
  const result = (await churchFinance(user, { from, to, groupId: group?.id }))!;

  const csv = toCsv([
    [
      "date",
      "member",
      "email",
      "group(s)",
      "type",
      "chema_month",
      "project",
      "amount",
      "currency",
      "status",
      "note",
      "recorded_by",
      "reviewed_by",
    ],
    ...result.rows.map((row) => [
      row.paidAt,
      row.member.name,
      row.member.email,
      row.groups.join("; "),
      row.type,
      row.chema ? `${row.chema.year}-${String(row.chema.month).padStart(2, "0")}` : "",
      row.project?.name ?? "",
      fromCents(row.cents),
      "USD",
      row.status,
      row.note ?? "",
      row.recordedBy,
      row.reviewedBy ?? "",
    ]),
  ]);

  await recordAudit({
    action: "FINANCE_EXPORTED",
    actor: user,
    detail: `${result.rows.length} rows, ${from} to ${to}${group ? `, ${group.name}` : ""}`,
  });

  // The byte-order mark makes spreadsheet programs read the file as UTF-8,
  // so names with accents survive the round trip.
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kmmi-finance-${harareToday()}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
