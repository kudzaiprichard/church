import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth/dal";
import { SOCIAL_PLATFORMS, getAllSocialLinks } from "@/lib/settings";
import { platformHint } from "@/lib/settings-schema";

import { Panel } from "../../_components/page-parts";

import { SocialForm } from "./social-form";

export const metadata: Metadata = { title: "Social media" };

/**
 * Social links (SCOPE §9.18). Apostles only. Facebook, Instagram, YouTube and
 * WhatsApp — Twitter/X is deliberately not offered.
 */
export default async function SocialPage() {
  await requirePermission("settings.manage");
  const links = await getAllSocialLinks();

  const rows = SOCIAL_PLATFORMS.map(({ platform, name }) => {
    const link = links.find((entry) => entry.platform === platform);
    return {
      platform,
      name,
      hint: platformHint(platform),
      handle: link?.handle ?? "",
      url: link?.url ?? "",
      isVisible: link?.isVisible ?? false,
    };
  });

  return (
    <Panel
      title="Social media"
      description="Round buttons on the home page and in the footer, with the handle under each. Clearing a link removes the button."
      className="max-w-3xl"
    >
      <SocialForm rows={rows} />
    </Panel>
  );
}
