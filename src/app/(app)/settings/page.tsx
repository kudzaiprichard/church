import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth/dal";
import { lastUpdatedLine } from "@/lib/last-updated";
import { getChurchInfo } from "@/lib/settings";

import { Panel } from "../_components/page-parts";

import { ChurchInfoForm } from "./church-info-form";

export const metadata: Metadata = { title: "Settings" };

/** Church information (SCOPE §9.18). Apostles only. */
export default async function ChurchInfoPage() {
  await requirePermission("settings.manage");
  const info = await getChurchInfo();

  return (
    <Panel
      title="Church information"
      description={lastUpdatedLine(info.updatedBy, info.updatedAt) ?? "Not saved from here yet."}
      className="max-w-3xl"
    >
      <ChurchInfoForm stored={info} />
    </Panel>
  );
}
