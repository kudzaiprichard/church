/**
 * The public site's static content — what genuinely does not change from the
 * portal.
 *
 * Everything leadership edits lives in the database and is read through
 * `src/lib/settings.ts`: the church's name, tagline, address, phone and
 * email; the Theme of the Year; social links; the connect groups and their
 * leaders. What stays here is the weekly rhythm (service times and the
 * timetable), the anchor verse, and the marketing copy for the portal.
 *
 * Today's devotion and the latest sermons come from their own modules.
 * Service times are still placeholders to confirm with the office.
 */

/**
 * The church's name, for the few places that must render with no database:
 * the root metadata, the boot loader, the legal pages' back link and the 404
 * page. Everything a visitor reads about the church — name, contacts, theme —
 * comes from Settings. Keep this in step with the seeded ChurchSettings.
 */
export const churchIdentity = {
  name: "Kingdom Manifest Ministries International",
  shortName: "KMMI",
  description:
    "Kingdom Manifest Ministries International — service times, connect groups and the member portal.",
};

/** The verse the whole church stands under. */
export const anchorScripture = {
  text: "Thy kingdom come, thy will be done on earth as it is in heaven.",
  reference: "Matthew 6:10",
};

export const bulletin = {
  heading: "The weekly bulletin",
  blurb: "One email on a Friday — the week ahead, who is preaching, and who needs praying for.",
};

export const services = [
  { name: "First Service", day: "Sunday", time: "08:00", note: "Prayer, worship and the Word" },
  {
    name: "Second Service",
    day: "Sunday",
    time: "10:30",
    note: "Full worship, Sunday School for children",
  },
  { name: "Midweek Prayer", day: "Wednesday", time: "18:00", note: "Intercession, ends by 19:15" },
  { name: "Youth Alive", day: "Friday", time: "18:30", note: "Ages 13 to 25" },
];

/** The week as a timetable — what happens, when, and where. */
export const week = [
  {
    day: "Sunday",
    short: "Sun",
    items: [
      { time: "08:00", name: "First Service", place: "Main sanctuary" },
      { time: "10:30", name: "Second Service", place: "Main sanctuary" },
    ],
  },
  {
    day: "Monday",
    short: "Mon",
    items: [{ time: "09:00", name: "Church office open", place: "Until 15:00" }],
  },
  {
    day: "Tuesday",
    short: "Tue",
    items: [{ time: "18:30", name: "Young Adults", place: "In homes" }],
  },
  {
    day: "Wednesday",
    short: "Wed",
    items: [{ time: "18:00", name: "Midweek prayer", place: "Main sanctuary" }],
  },
  {
    day: "Thursday",
    short: "Thu",
    items: [{ time: "17:30", name: "Praise and Worship rehearsal", place: "Main sanctuary" }],
  },
  {
    day: "Friday",
    short: "Fri",
    items: [{ time: "18:30", name: "Youth Alive", place: "Main sanctuary" }],
  },
  {
    day: "Saturday",
    short: "Sat",
    items: [{ time: "08:00", name: "Kingdom Real Men breakfast", place: "Fortnightly" }],
  },
];

/** What the member portal offers, as the landing page describes it. */
export const portalFeatures = [
  {
    title: "Daily Devotions",
    detail: "Start your day with powerful Word and encouragement.",
    icon: "book",
  },
  {
    title: "Events & Calendar",
    detail: "Never miss a service, meeting, or special program.",
    icon: "calendar",
  },
  {
    title: "Tithes & Giving",
    detail: "Record your chema, tithe and pledges, and see them confirmed.",
    icon: "giving",
  },
  {
    title: "Connect Groups",
    detail: "Find your family within the bigger church family.",
    icon: "groups",
  },
] as const;
