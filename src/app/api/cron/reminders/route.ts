import { runReminders } from "@/lib/cron-jobs";
import { cronAuthorized } from "@/lib/cron-rules";
import { env } from "@/lib/env";

/**
 * Reminders for events starting 23 to 25 hours from now, each sent once
 * (docs/SCOPE.md §9.21). Only Vercel Cron, carrying `CRON_SECRET`, may run it.
 *
 * Not scheduled in vercel.json: Vercel's Hobby plan runs cron at most daily
 * and refuses to deploy an hourly job, so the daily job sends tomorrow's
 * reminders instead. On a paid plan, add `{ "path": "/api/cron/reminders",
 * "schedule": "0 * * * *" }` for reminders a day before to the hour.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request.headers.get("authorization"), env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const summary = await runReminders();
  console.info("[cron/reminders]", JSON.stringify(summary));
  return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
}
