import {
  BellIcon,
  CalendarDaysIcon,
  ChurchIcon,
  ClipboardCheckIcon,
  CircleUserIcon,
  HandHeartIcon,
  HandshakeIcon,
  InboxIcon,
  LayoutDashboardIcon,
  MusicIcon,
  UserIcon,
  UsersIcon,
  UsersRoundIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

import type { IconName } from "./nav";

/**
 * One place mapping the navigation's icon names to actual glyphs, so `nav.ts`
 * stays a plain data file that a Server Component can import without dragging
 * an icon library along with it.
 */
const ICONS: Record<IconName, LucideIcon> = {
  // Rail sections
  overview: LayoutDashboardIcon,
  people: UsersIcon,
  life: ChurchIcon,
  records: ClipboardCheckIcon,
  you: CircleUserIcon,
  // Panel pages
  dashboard: LayoutDashboardIcon,
  users: UsersIcon,
  groups: UsersRoundIcon,
  inbox: InboxIcon,
  calendar: CalendarDaysIcon,
  prayer: HandHeartIcon,
  attendance: ClipboardCheckIcon,
  giving: WalletIcon,
  partnership: HandshakeIcon,
  sermons: MusicIcon,
  bell: BellIcon,
  account: UserIcon,
};

export function NavIcon({ name, className }: { name: IconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden strokeWidth={1.75} />;
}
