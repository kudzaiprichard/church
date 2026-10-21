/**
 * Content for the public site.
 *
 * The name, theme, groups, sermons and devotion are Kingdom Manifest Ministries
 * International's own, carried over from the KMMI member portal. The address,
 * phone, email and service times are still placeholders — replace them with the
 * real details before the site goes anywhere near a domain. Everything is kept
 * in one place so that is a single edit.
 */

export const church = {
  name: "Kingdom Manifest Ministries International",
  shortName: "KMMI",
  founded: 1998,
  tagline:
    "Proclaiming the Kingdom of God, raising disciples, and manifesting His glory across the nations.",
  address: {
    line1: "14 Josiah Chinamano Avenue",
    city: "Harare",
    country: "Zimbabwe",
  },
  phone: "+263 77 100 0001",
  email: "hello@kmmi.church",
  pastor: "Apostle Takura James Makamba",
  /** Opens the address in whichever map app the visitor uses. */
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=14+Josiah+Chinamano+Avenue,+Harare,+Zimbabwe",
};

/** The verse the whole church stands under. */
export const anchorScripture = {
  text: "Thy kingdom come, thy will be done on earth as it is in heaven.",
  reference: "Matthew 6:10",
};

export const themeOfYear = {
  year: 2026,
  title: "Year of Kingdom Expressions",
  scripture: "2 Corinthians 5:20",
  verseText:
    "We are therefore Christ's ambassadors, as though God were making his appeal through us. We implore you on Christ's behalf: Be reconciled to God.",
  description:
    "In 2026, KMMI rises as Kingdom ambassadors — representing Heaven's culture in every sphere of life. This is the year we move beyond personal blessing into bold, intentional expression of the Kingdom.",
};

export const socials = [
  { name: "Facebook", handle: "@KMMIOfficial", href: "https://www.facebook.com/KMMIOfficial" },
  { name: "Instagram", handle: "@kmmi_official", href: "https://www.instagram.com/kmmi_official" },
  { name: "YouTube", handle: "KMMI Church", href: "https://www.youtube.com/@KMMIChurch" },
  { name: "WhatsApp", handle: "+263 77 100 0001", href: "https://wa.me/263771000001" },
] as const;

export const bulletin = {
  heading: "The weekly bulletin",
  blurb: "One email on a Friday — the week ahead, who is preaching, and who needs praying for.",
};

/** The connect groups, as the portal names and describes them. */
export const connectGroups = [
  { name: "Youth Alive", audience: "Ages 13–25", detail: "Discipleship, worship and Kingdom living for a bold generation." },
  { name: "Sunday School", audience: "Children", detail: "Biblical teaching and creative worship every Sunday morning." },
  { name: "Kingdom Real Men", audience: "Men", detail: "Standing firm as Kingdom fathers, husbands and leaders." },
  { name: "Kingdom Total Women", audience: "Women", detail: "Discovering identity in Christ and a God-given destiny." },
  { name: "Young Adults", audience: "Ages 26–35", detail: "Fellowship, career mentorship and spiritual growth." },
  { name: "Praise and Worship", audience: "Ministry team", detail: "Leading the church into God's presence in music and song." },
  { name: "Hosting", audience: "Ministry team", detail: "Ushers and greeters who make every visitor feel at home." },
];

export const services = [
  { name: "First Service", day: "Sunday", time: "08:00", note: "Prayer, worship and the Word" },
  { name: "Second Service", day: "Sunday", time: "10:30", note: "Full worship, Sunday School for children" },
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
  { title: "Daily Devotions", detail: "Start your day with powerful Word and encouragement.", icon: "book" },
  { title: "Events & Calendar", detail: "Never miss a service, meeting, or special program.", icon: "calendar" },
  { title: "Tithes & Offerings", detail: "Securely manage your giving and track pledges.", icon: "giving" },
  { title: "Connect Groups", detail: "Find your family within the bigger church family.", icon: "groups" },
] as const;

export const devotion = {
  title: "Walking in Kingdom Authority",
  author: "Apostle Edna Makamba",
  initials: "EM",
  scriptureQuote: "Thy kingdom come, thy will be done on earth as it is in heaven.",
  scriptureReference: "Matthew 6:10",
  opening:
    "The believer who understands their position in Christ walks not in timidity but in authority. The Kingdom of God is not a distant concept reserved for eternity — it is the present reality of every blood-washed child of God. When Jesus taught His disciples to pray \"Thy Kingdom come,\" He was anchoring them to a truth: Heaven's culture is meant to be reproduced on earth, through us.",
};

export const recentSermons = [
  {
    title: "Ambassadors of the Kingdom",
    preacher: "Apostle Takura James Makamba",
    date: "2026-05-25",
    series: "Kingdom Expressions 2026",
    passage: "2 Corinthians 5:20",
    summary:
      "The profound identity of every believer as an ambassador of the Kingdom — carrying Heaven's culture wherever we go.",
  },
  {
    title: "The Fire That Does Not Consume",
    preacher: "Apostle Edna Makamba",
    date: "2026-05-18",
    series: "Kingdom Expressions 2026",
    passage: "Exodus 3:2",
    summary:
      "A prophetic word from the burning bush: the call to carry the fire of God without being destroyed by it.",
  },
  {
    title: "The Dominion Mandate Revisited",
    preacher: "Apostle Takura James Makamba",
    date: "2026-05-11",
    series: "Kingdom Expressions 2026",
    passage: "Genesis 1:28",
    summary:
      "Dominion is not domination — it is stewardship, creativity, and the responsibility to reflect God's rule in every sphere.",
  },
];
