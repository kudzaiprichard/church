/**
 * Seed a database with the church's starting content: `npm run db:seed`.
 *
 * Idempotent. Every row is an upsert keyed on something natural (the settings
 * row's fixed id, a theme's year, a platform, a group's slug, a project's
 * name), so running it
 * twice changes nothing, and running it against a live database only ever
 * *creates what is missing* — it never overwrites what leadership has since
 * edited in the portal. That is why the `update` branches below are empty.
 *
 * It creates no people. The first Apostle comes from the bootstrap variables
 * (see .env.example); everyone else is enrolled through the portal, and group
 * leaders are assigned there once their accounts exist.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

import { churchSettings, groups, projects, socialLinks, themes } from "./seed-data";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  await prisma.churchSettings.upsert({
    where: { id: "church" },
    create: { id: "church", ...churchSettings },
    update: {},
  });

  for (const theme of themes) {
    await prisma.themeOfYear.upsert({ where: { year: theme.year }, create: theme, update: {} });
  }

  for (const link of socialLinks) {
    await prisma.socialLink.upsert({
      where: { platform: link.platform },
      create: link,
      update: {},
    });
  }

  for (const group of groups) {
    await prisma.group.upsert({ where: { slug: group.slug }, create: group, update: {} });
  }

  for (const project of projects) {
    await prisma.partnershipProject.upsert({
      where: { name: project.name },
      create: project,
      update: {},
    });
  }

  const [settings, themeCount, linkCount, groupCount, projectCount] = await Promise.all([
    prisma.churchSettings.count(),
    prisma.themeOfYear.count(),
    prisma.socialLink.count(),
    prisma.group.count(),
    prisma.partnershipProject.count(),
  ]);

  console.info(
    `[seed] church settings: ${settings}, themes: ${themeCount}, social links: ${linkCount}, groups: ${groupCount}, projects: ${projectCount}`,
  );
}

main()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
