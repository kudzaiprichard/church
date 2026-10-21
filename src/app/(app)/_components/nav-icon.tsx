import {
  BellIcon,
  BookOpenIcon,
  CakeIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  ChurchIcon,
  ClipboardCheckIcon,
  ScrollTextIcon,
  CircleUserIcon,
  DropletsIcon,
  HandHeartIcon,
  HandshakeIcon,
  IdCardIcon,
  InboxIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MusicIcon,
  NotebookPenIcon,
  SettingsIcon,
  ShieldIcon,
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
  admin: ShieldIcon,
  // Panel pages
  dashboard: LayoutDashboardIcon,
  users: UsersIcon,
  groups: UsersRoundIcon,
  birthday: CakeIcon,
  baptism: DropletsIcon,
  inbox: InboxIcon,
  calendar: CalendarDaysIcon,
  prayer: HandHeartIcon,
  sermons: MusicIcon,
  devotion: BookOpenIcon,
  attendance: ClipboardCheckIcon,
  giving: WalletIcon,
  finance: LandmarkIcon,
  chema: CalendarCheckIcon,
  review: ListChecksIcon,
  partnership: HandshakeIcon,
  profile: IdCardIcon,
  notes: NotebookPenIcon,
  bell: BellIcon,
  account: UserIcon,
  settings: SettingsIcon,
  audit: ScrollTextIcon,
};

export function NavIcon({ name, className }: { name: IconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden strokeWidth={1.75} />;
}
