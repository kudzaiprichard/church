/**
 * Placeholder content for the public site.
 *
 * Every name, time, address and figure here is invented. Replace this file
 * with the real congregation's details before the site goes anywhere near a
 * domain — it is deliberately kept in one place so that is a single edit.
 */

export const church = {
  name: "Cornerstone Chapel",
  shortName: "Cornerstone",
  founded: 1998,
  tagline: "A church in the middle of the city, for people in the middle of a week.",
  address: {
    line1: "14 Josiah Chinamano Avenue",
    city: "Harare",
    country: "Zimbabwe",
  },
  phone: "+263 24 279 0114",
  email: "hello@cornerstonechapel.org",
  pastor: "Rev. Tendai Marufu",
  denomination: "In fellowship with the Evangelical Church of Zimbabwe",
  /** Opens the address in whichever map app the visitor uses. */
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=14+Josiah+Chinamano+Avenue,+Harare,+Zimbabwe",
  /** The one thing people ask at the door before they ask anything else. */
  parking: "Free parking behind the hall. Entrance off Sixth Street, not the main avenue.",
  landmark: "On the corner of Josiah Chinamano and Sixth, opposite the post office.",
};

/** Who we are, in the fewest words that still say something. */
export const mission = {
  statement:
    "A church is not a building you visit. It is a few hundred people who know your name and notice when you are missing.",
  body: "We are an ordinary congregation in the centre of Harare — teachers, nurses, students, traders, grandmothers. We read the Bible together, we pray for each other by name, and we try to be useful to the street we sit on. Everything else here exists to make that possible in a city where everyone is busy.",
};

/** Placeholder handles. Point these at the real accounts before launch. */
export const socials = [
  { name: "Facebook", href: "https://facebook.com/cornerstonechapelhre" },
  { name: "Instagram", href: "https://instagram.com/cornerstonechapelhre" },
  { name: "YouTube", href: "https://youtube.com/@cornerstonechapelhre" },
  { name: "WhatsApp", href: "https://wa.me/263242790114" },
];

export const bulletin = {
  heading: "The weekly bulletin",
  blurb: "One email on a Friday — the week ahead, who is preaching, and who needs praying for.",
};

export const services = [
  { name: "First Service", day: "Sunday", time: "08:00", note: "Quieter, liturgy and communion" },
  { name: "Second Service", day: "Sunday", time: "10:30", note: "Full band, children's church" },
  { name: "Midweek Prayer", day: "Wednesday", time: "18:00", note: "In the chapel, ends by 19:15" },
  { name: "Youth Gathering", day: "Friday", time: "18:30", note: "School years 8 to 13" },
];

export const visitFacts = [
  {
    heading: "Getting here",
    body: "On the corner of Josiah Chinamano and Sixth. Free parking behind the hall, entrance off Sixth.",
  },
  {
    heading: "What to wear",
    body: "Whatever you own. You will see suits and you will see sandals, usually in the same row.",
  },
  {
    heading: "Your children",
    body: "Children's church runs during the 10:30 service for ages 3 to 12. Check-in opens at 10:15.",
  },
  {
    heading: "How long",
    body: "About ninety minutes. Tea afterwards in the courtyard, and nobody minds if you slip away.",
  },
];

/**
 * The shape of a Sunday morning, in minutes. It adds up to ninety, which is
 * the claim the page makes — so if you change one of these, change another.
 */
export const sundayShape = [
  {
    name: "Welcome & singing",
    minutes: 20,
    note: "Four or five songs. Stand or stay sitting, whichever you like.",
  },
  {
    name: "Notices & offering",
    minutes: 7,
    note: "A bag is passed. Visitors are not expected to put anything in it.",
  },
  {
    name: "Reading & sermon",
    minutes: 35,
    note: "One passage, read aloud and then worked through. The longest part.",
  },
  {
    name: "Prayer & response",
    minutes: 18,
    note: "Out loud and in silence. Communion on the first Sunday of the month.",
  },
  {
    name: "Blessing",
    minutes: 10,
    note: "A few words to send everyone out, then tea in the courtyard.",
  },
];

/** Twelve ministries — kept for the member-facing modules. */
export const ministries = [
  { name: "Children", detail: "Sunday teaching and holiday clubs for ages 3 to 12." },
  { name: "Youth", detail: "Friday gatherings, camps and mentoring for teenagers." },
  { name: "Young Adults", detail: "Students and early-career, meeting Tuesdays in homes." },
  { name: "Men's Fellowship", detail: "Saturday breakfast, service projects, accountability." },
  { name: "Women's Fellowship", detail: "Midweek study, mentoring and the annual retreat." },
  { name: "Worship & Music", detail: "Choir, band and the rota that keeps Sunday singing." },
  { name: "Hospitality", detail: "Ushering, welcome desk, and tea in the courtyard after." },
  { name: "Media & Sound", detail: "Livestream, recording and the sermon archive." },
  { name: "Prayer", detail: "Wednesday intercession and the standing prayer chain." },
  { name: "Outreach & Missions", detail: "Feeding scheme, prison visits and partner churches." },
  { name: "Marriage & Family", detail: "Preparation courses and support for couples." },
  { name: "Counselling", detail: "Confidential appointments with trained members." },
];

/** The week as a timetable — what happens, when, and where. */
export const week = [
  {
    day: "Sunday",
    short: "Sun",
    items: [
      { time: "08:00", name: "First Service", place: "Chapel" },
      { time: "10:30", name: "Second Service", place: "Main hall" },
      { time: "12:00", name: "Tea together", place: "Courtyard" },
    ],
  },
  {
    day: "Monday",
    short: "Mon",
    items: [{ time: "09:00", name: "Office & pastoral visits", place: "Until 15:00" }],
  },
  {
    day: "Tuesday",
    short: "Tue",
    items: [{ time: "18:30", name: "Young adults", place: "In homes" }],
  },
  {
    day: "Wednesday",
    short: "Wed",
    items: [{ time: "18:00", name: "Midweek prayer", place: "Chapel" }],
  },
  {
    day: "Thursday",
    short: "Thu",
    items: [{ time: "17:30", name: "Choir & band", place: "Main hall" }],
  },
  {
    day: "Friday",
    short: "Fri",
    items: [{ time: "18:30", name: "Youth gathering", place: "Main hall" }],
  },
  {
    day: "Saturday",
    short: "Sat",
    items: [
      { time: "07:00", name: "Outreach", place: "Meet at the hall" },
      { time: "08:00", name: "Men's breakfast", place: "Fortnightly" },
    ],
  },
];

export const currentSeries = {
  title: "The Weight of Grace",
  blurb:
    "Eight weeks in Paul's letter to the Romans, on what it costs to be forgiven and what it frees you to become.",
  sermons: [
    { part: "01", title: "Nobody is exempt", passage: "Romans 1:18–32", date: "2026-07-12", speaker: "Rev. Tendai Marufu" },
    { part: "02", title: "The law was never the point", passage: "Romans 3:19–31", date: "2026-07-19", speaker: "Rev. Tendai Marufu" },
    { part: "03", title: "Abraham believed", passage: "Romans 4:1–25", date: "2026-07-26", speaker: "Pastor Nyasha Chikore" },
    { part: "04", title: "Peace, and access", passage: "Romans 5:1–11", date: "2026-08-02", speaker: "Rev. Tendai Marufu" },
  ],
};

export const upcoming = [
  { date: "2026-08-14", day: "14", month: "Aug", title: "Church-wide fast begins", detail: "Three days, ending with Sunday communion." },
  { date: "2026-08-22", day: "22", month: "Aug", title: "Membership class", detail: "One Saturday morning, 09:00 to 12:00." },
  { date: "2026-09-05", day: "05", month: "Sep", title: "Marriage preparation course", detail: "Six Saturdays for engaged couples." },
  { date: "2026-09-19", day: "19", month: "Sep", title: "Outreach: Mbare feeding scheme", detail: "Volunteers meet at the hall, 07:00." },
];

export const lastSunday = [
  { label: "In the building", value: "312" },
  { label: "Watching online", value: "148" },
  { label: "Connect groups", value: "18" },
  { label: "Members", value: "412" },
];
