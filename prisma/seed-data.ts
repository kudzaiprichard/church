/**
 * What a fresh database starts with (docs/SCOPE.md §6.1).
 *
 * Church content that leadership edits in the portal afterwards — the church's
 * details, the Theme of the Year, social links and the seven connect groups.
 * The seed writes it once; from then on the database is the source and this
 * file is only the starting point for a new environment.
 *
 * The address, phone and email are placeholders until leadership supplies
 * the real ones (SCOPE §11 Q7). Mission, vision and doctrine are left for
 * leadership to write in Settings rather than invented here.
 */

export const churchSettings = {
  name: "Kingdom Manifest Ministries International",
  shortName: "KMMI",
  tagline:
    "Proclaiming the Kingdom of God, raising disciples, and manifesting His glory across the nations.",
  address: "14 Josiah Chinamano Avenue, Harare, Zimbabwe",
  phone: "+263 77 100 0001",
  email: "hello@kmmi.church",
};

/** Newest first. The highest year is the current theme. */
export const themes = [
  {
    year: 2026,
    title: "Year of Kingdom Expressions",
    scriptureRef: "2 Corinthians 5:20",
    verseText:
      "We are therefore Christ's ambassadors, as though God were making his appeal through us. We implore you on Christ's behalf: Be reconciled to God.",
    description:
      "In 2026, KMMI rises as Kingdom ambassadors — representing Heaven's culture in every sphere of life. This is the year we move beyond personal blessing into bold, intentional expression of the Kingdom.",
  },
  {
    year: 2025,
    title: "Supernatural Encounters",
    scriptureRef: "2 Corinthians 4:17",
    verseText:
      "For our light and momentary troubles are achieving for us an eternal glory that far outweighs them all.",
  },
  {
    year: 2024,
    title: "Divine Alignment",
    scriptureRef: "Jeremiah 29:11",
    verseText:
      "“For I know the plans I have for you,” declares the Lord, “plans to prosper you and not to harm you, plans to give you hope and a future.”",
  },
  {
    year: 2023,
    title: "Kingdom Dominion",
    scriptureRef: "Genesis 1:28",
    verseText:
      "God blessed them and said to them, “Be fruitful and increase in number; fill the earth and subdue it. Rule over the fish in the sea and the birds in the sky and over every living creature that moves on the ground.”",
  },
];

export const socialLinks = [
  { platform: "FACEBOOK", handle: "@KMMIOfficial", url: "https://www.facebook.com/KMMIOfficial" },
  {
    platform: "INSTAGRAM",
    handle: "@kmmi_official",
    url: "https://www.instagram.com/kmmi_official",
  },
  { platform: "YOUTUBE", handle: "KMMI Church", url: "https://www.youtube.com/@KMMIChurch" },
  { platform: "WHATSAPP", handle: "+263 77 100 0001", url: "https://wa.me/263771000001" },
] as const;

/** The seven connect groups (SCOPE §4.1). Leaders are assigned in the portal. */
export const groups = [
  {
    slug: "youth-alive",
    name: "Youth Alive",
    audience: "Ages 13–25",
    description: "Discipleship, worship and Kingdom living for a bold generation.",
  },
  {
    slug: "sunday-school",
    name: "Sunday School",
    audience: "Children",
    description: "Biblical teaching and creative worship every Sunday morning.",
  },
  {
    slug: "kingdom-real-men",
    name: "Kingdom Real Men",
    audience: "Men",
    description: "Standing firm as Kingdom fathers, husbands and leaders.",
  },
  {
    slug: "kingdom-total-women",
    name: "Kingdom Total Women",
    audience: "Women",
    description: "Discovering identity in Christ and a God-given destiny.",
  },
  {
    slug: "young-adults",
    name: "Young Adults",
    audience: "Ages 26–35",
    description: "Fellowship, career mentorship and spiritual growth.",
  },
  {
    slug: "praise-and-worship",
    name: "Praise and Worship",
    audience: "Ministry team",
    description: "Leading the church into God's presence in music and song.",
  },
  {
    slug: "hosting",
    name: "Hosting",
    audience: "Ministry team",
    description: "Ushers and greeters who make every visitor feel at home.",
  },
];

/**
 * The five partnership projects (SCOPE §6.1). The targets are placeholders
 * agreed on 2026-10-22 until leadership supplies the real ones (SCOPE §11 Q6);
 * an Apostle can change them in the portal, and Phase 6 replaces them before
 * go-live. Amounts are strings so they reach the Decimal column exactly.
 */
export const PLACEHOLDER_TARGET = "1000.00";

export const projects = [
  {
    name: "Building Fund",
    description: "Placeholder target — to be confirmed by leadership.",
  },
  {
    name: "Missions Support",
    description: "Placeholder target — to be confirmed by leadership.",
  },
  {
    name: "Equipment Fund",
    description: "Placeholder target — to be confirmed by leadership.",
  },
  {
    name: "Church Van Fund",
    description: "Placeholder target — to be confirmed by leadership.",
  },
  {
    name: "Community Outreach",
    description: "Placeholder target — to be confirmed by leadership.",
  },
].map((project) => ({
  ...project,
  targetAmount: PLACEHOLDER_TARGET,
  startDate: new Date("2026-01-01T00:00:00.000Z"),
}));
