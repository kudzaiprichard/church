import type { ReactNode } from "react";

import { requirePermission } from "@/lib/auth/dal";

import { PageHeader } from "../_components/page-parts";

import { SettingsTabs } from "./settings-tabs";

/**
 * The frame around the three settings pages.
 *
 * The guard here only decides whether to draw the frame. Each page and each
 * action checks `settings.manage` again, because a layout is not re-run on
 * every navigation and an action never runs it at all.
 */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await requirePermission("settings.manage");

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="What the public website and the portal say about the church. Changes show on the next page load."
      />
      <SettingsTabs />
      {children}
    </>
  );
}
