import { week } from "@/lib/church";

/**
 * The congregation's clock. A visitor reading the site from London should still
 * be told when the doors open in Harare, so every comparison here is made in
 * the church's own timezone rather than the browser's.
 */
const CHURCH_TIME_ZONE = "Africa/Harare";

const churchClock = new Intl.DateTimeFormat("en-US", {
  timeZone: CHURCH_TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export type NextGathering = {
  day: string;
  time: string;
  name: string;
  place: string;
  /** 0 for later today, 1 for tomorrow, and so on. */
  inDays: number;
};

function minutesOf(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * The next thing on the timetable after `now`, searching forward through the
 * week and wrapping around to Sunday. Returns null only if the timetable is
 * empty, which would mean `week` itself is misconfigured.
 */
export function nextGathering(now: Date): NextGathering | null {
  const parts = churchClock.formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  const today = week.findIndex((day) => day.short === weekday);
  if (today === -1) return null;

  const nowInMinutes = hour * 60 + minute;

  // Eight passes, not seven: if everything left today has been and gone we
  // need to come back around to today's first item a week later.
  for (let ahead = 0; ahead < 8; ahead += 1) {
    const day = week[(today + ahead) % week.length];
    for (const item of day.items) {
      if (ahead === 0 && minutesOf(item.time) <= nowInMinutes) continue;
      return { day: day.day, time: item.time, name: item.name, place: item.place, inDays: ahead };
    }
  }

  return null;
}

/** "Today", "Tomorrow", or the day's name — whichever a person would actually say. */
export function whenLabel(gathering: NextGathering) {
  if (gathering.inDays === 0) return "Today";
  if (gathering.inDays === 1) return "Tomorrow";
  return gathering.day;
}
