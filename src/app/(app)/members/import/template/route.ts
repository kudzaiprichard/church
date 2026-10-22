import { requirePermission } from "@/lib/auth/dal";
import { TEMPLATE_HEADER } from "@/lib/members/import";

/** A blank import template: the column headings only, so no example row is imported by mistake. */
export async function GET() {
  await requirePermission("members.enroll");
  return new Response(`${TEMPLATE_HEADER}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="member-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
