import { runDaily } from "@/lib/cron-jobs";
import { cronAuthorized } from "@/lib/cron-rules";
import { env } from "@/lib/env";

/**
 * The morning job, 06:00 Harare (vercel.json): birthdays, today's devotion,
 * pledge reminders and housekeeping (docs/SCOPE.md §9.21). Only Vercel Cron,
 * carrying `CRON_SECRET`, may run it; a second run in a day adds nothing.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request.headers.get("authorization"), env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const summary = await runDaily();
  console.info("[cron/daily]", JSON.stringify(summary));
  return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
}
