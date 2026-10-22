import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClipboardCheckIcon,
  HandHeartIcon,
  MegaphoneIcon,
  SendIcon,
  UsersRoundIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth/dal";
import { ROLE_LABELS, can } from "@/lib/auth/permissions";
import { groupEvents } from "@/lib/data/events";
import { chemaCompliance } from "@/lib/data/finance";
import { getGroup, peopleForGroup } from "@/lib/data/groups";
import { groupAnnouncements } from "@/lib/data/messages";
import { prayerBoard } from "@/lib/data/prayer";
import { harareToday } from "@/lib/dates";
import { cn } from "@/lib/utils";

import {
  DateChip,
  EmptyState,
  FactList,
  PageGrid,
  PageHeader,
  Panel,
  PanelLink,
  QuickActions,
} from "../../_components/page-parts";
import { PersonAvatar } from "../../_components/person-avatar";
import { EventListItem } from "../../events/event-parts";
import { PrayerList } from "../../prayer/prayer-board";
import { PrayerForm } from "../../prayer/prayer-form";
import { removeMember } from "../actions";
import { AddMembersForm, DeleteGroupForm, GroupForm, LeaderForm } from "../group-form";

export const metadata: Metadata = { title: "Connect group" };

const sent = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Harare",
});

/**
 * One connect group (docs/SCOPE.md §9.4).
 *
 * `getGroup` returns `null` for a group that is not the caller's — a member of
 * Youth Alive opening Kingdom Total Women gets the same 404 as a mistyped id.
 * Contact details come back only for the group's leader and the Apostles, so
 * this page draws whatever it was given.
 */
export default async function GroupPage(props: PageProps<"/groups/[id]">) {
  const user = await requireSession();
  const { id } = await props.params;
  const { tab } = await props.searchParams;

  const group = await getGroup(user, id);
  if (!group) notFound();

  const tabs = [
    { id: "members", label: "Members" },
    { id: "announcements", label: "Announcements" },
    { id: "events", label: "Events" },
    { id: "prayer", label: "Prayer" },
    ...(group.viewer.manages ? [{ id: "manage", label: "Manage" }] : []),
  ];
  const active = tabs.find((entry) => entry.id === tab)?.id ?? "members";

  const todayIso = harareToday();
  const [announcements, people, events, prayer, chema] = await Promise.all([
    active === "announcements" ? groupAnnouncements(user, group.id, group.viewer.leads) : [],
    active === "manage" ? peopleForGroup(user, group.id) : { all: [], notInGroup: [] },
    // Every tab shows the next events beside it, so these are always read.
    groupEvents(group.id),
    active === "prayer" ? prayerBoard(user, group.id) : null,
    // This month's chema, for a finance officer or this group's own leader
    // only. For a leader of a *different* group, chemaCompliance would answer
    // about the groups they lead — the wrong group's figures under this name.
    can(user, "finance.viewAll") || group.leader?.id === user.id
      ? chemaCompliance(user, {
          year: Number(todayIso.slice(0, 4)),
          month: Number(todayIso.slice(5, 7)),
          groupId: group.id,
        })
      : null,
  ]);

  const activeCount = group.members.filter((member) => member.isActive).length;
  const next = events.upcoming.slice(0, 3);

  const aside = (
    <>
      <Panel title="This group">
        <FactList
          facts={[
            {
              label: "Leader",
              value: group.leader ? `${group.leader.firstName} ${group.leader.lastName}` : "Vacant",
            },
            { label: "Active members", value: activeCount },
            ...(chema
              ? [
                  {
                    label: "Chema paid this month",
                    value: `${chema.paid} of ${chema.total}`,
                    href: `/finance/chema?group=${group.id}`,
                  },
                ]
              : []),
            { label: "Events coming up", value: events.upcoming.length },
          ]}
        />
      </Panel>

      <Panel
        title="Next events"
        action={<PanelLink href={`/groups/${group.id}?tab=events`}>All</PanelLink>}
      >
        {next.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing planned yet.</p>
        ) : (
          <ul className="grid gap-2.5">
            {next.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.id}`} className="group flex items-center gap-3">
                  <DateChip date={event.date} highlight={event.date === todayIso} />
                  <span className="min-w-0">
                    <span className="text-foreground block truncate text-sm font-medium group-hover:underline">
                      {event.title}
                    </span>
                    <span className="text-muted-foreground numeric block truncate text-xs">
                      {event.time}
                      {event.location && ` · ${event.location}`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {group.viewer.leads && (
        <QuickActions
          title="For the leader"
          actions={[
            {
              href: `/messages/new?group=${group.id}`,
              label: "Message the group",
              icon: <SendIcon aria-hidden />,
              hint: "Everyone in it, in their inbox",
            },
            ...(next[0]
              ? [
                  {
                    href: `/events/${next[0].id}`,
                    label: "Take attendance",
                    icon: <ClipboardCheckIcon aria-hidden />,
                    hint: `At ${next[0].title}`,
                  },
                ]
              : []),
            {
              href: `/groups/${group.id}?tab=prayer`,
              label: "Prayer requests",
              icon: <HandHeartIcon aria-hidden />,
              hint: "Pin, answer or remove",
            },
          ]}
        />
      )}
    </>
  );

  return (
    <>
      <Link
        href="/groups"
        className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        Connect groups
      </Link>

      <PageHeader
        eyebrow={group.audience ?? "Connect group"}
        title={group.name}
        description={
          <>
            {group.leader ? (
              <>
                Led by{" "}
                <span className="text-foreground font-medium">
                  {group.leader.firstName} {group.leader.lastName}
                </span>
              </>
            ) : (
              <span className="italic">Leader: Vacant</span>
            )}
            {" · "}
            <span className="numeric">
              {activeCount} {activeCount === 1 ? "member" : "members"}
            </span>
          </>
        }
        actions={
          group.viewer.leads && (
            <Link
              href={`/messages/new?group=${group.id}`}
              className="action-solid inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <SendIcon className="size-4" aria-hidden />
              Message the group
            </Link>
          )
        }
      />

      {group.description && (
        <p className="text-muted-foreground -mt-2 mb-6 max-w-3xl text-sm leading-relaxed">
          {group.description}
        </p>
      )}

      <PageGrid aside={aside}>
        <div className="min-w-0">
          <nav
            aria-label="Group"
            className="border-border mb-4 flex gap-1 overflow-x-auto border-b"
          >
            {tabs.map((entry) => (
              <Link
                key={entry.id}
                href={
                  entry.id === "members"
                    ? `/groups/${group.id}`
                    : `/groups/${group.id}?tab=${entry.id}`
                }
                aria-current={entry.id === active ? "page" : undefined}
                className={cn(
                  "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                  entry.id === active
                    ? "border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {entry.label}
              </Link>
            ))}
          </nav>

          {active === "members" && (
            <Panel
              title="Members"
              description={
                group.viewer.leads
                  ? "With contact details, which only the leader and the Apostles see."
                  : "Fellow members by name. Contact details stay with the leader."
              }

              bodyClassName="p-0"
            >
              {group.members.length === 0 ? (
                <EmptyState
                  icon={<UsersRoundIcon className="size-5" aria-hidden />}
                  title="Nobody yet"
                >
                  {group.viewer.manages
                    ? "Add members from Manage."
                    : "This group has no members yet."}
                </EmptyState>
              ) : (
                <ul className="divide-border divide-y">
                  {group.members.map((member) => (
                    <li key={member.id} className="flex items-center gap-3 px-4 py-2.5">
                      <PersonAvatar person={member} muted={!member.isActive} />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          {group.viewer.leads ? (
                            <Link
                              href={`/members/${member.id}`}
                              className="text-foreground rounded-sm text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                            >
                              {member.firstName} {member.lastName}
                            </Link>
                          ) : (
                            <span className="text-foreground text-sm font-semibold">
                              {member.firstName} {member.lastName}
                            </span>
                          )}
                          {member.isLeader && (
                            <span className="bg-brass/20 text-accent-foreground rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold">
                              Leader
                            </span>
                          )}
                          {member.role !== "MEMBER" && (
                            <span className="bg-secondary text-primary rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold">
                              {ROLE_LABELS[member.role]}
                            </span>
                          )}
                          {!member.isActive && (
                            <span className="bg-destructive/10 text-destructive rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold">
                              Deactivated
                            </span>
                          )}
                          {member.id === user.id && (
                            <span className="text-muted-foreground text-xs">(you)</span>
                          )}
                        </p>
                        {member.contact && (
                          <p className="text-muted-foreground mt-0.5 truncate text-xs">
                            {member.contact.email}
                            {member.contact.phone && (
                              <span className="numeric"> · {member.contact.phone}</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {group.viewer.leads && member.id !== user.id && member.isActive && (
                          <Link
                            href={`/messages/new?to=${member.id}`}
                            className="border-border text-foreground/80 hover:bg-muted inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                          >
                            Message
                          </Link>
                        )}
                        {group.viewer.manages && !member.isLeader && (
                          <form action={removeMember.bind(null, group.id, member.id)}>
                            <button
                              type="submit"
                              className="border-destructive/25 text-destructive hover:bg-destructive/10 h-7 cursor-pointer rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                            >
                              Remove
                            </button>
                          </form>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {active === "announcements" && (
            <Panel
              title="Announcements"
              description={
                group.viewer.leads
                  ? "Everything sent to this group."
                  : "Messages sent to this group while you were in it."
              }

              bodyClassName="p-0"
            >
              {announcements.length === 0 ? (
                <EmptyState
                  icon={<MegaphoneIcon className="size-5" aria-hidden />}
                  title="Nothing yet"
                >
                  {group.viewer.leads
                    ? "Messages you send to the group appear here."
                    : "Announcements from the leader will appear here."}
                </EmptyState>
              ) : (
                <ul className="divide-border divide-y">
                  {announcements.map((message) => (
                    <li key={message.id}>
                      <Link
                        href={`/messages/${message.id}`}
                        className="hover:bg-muted/60 block px-5 py-4 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none focus-visible:ring-inset"
                      >
                        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="text-foreground text-sm font-semibold">
                            {message.subject}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {sent.format(new Date(message.sentAt))}
                          </span>
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          From {message.sender.name}
                        </p>
                        <p className="text-muted-foreground mt-1.5 line-clamp-2 text-sm">
                          {message.excerpt}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {active === "events" && (
            <div className="grid gap-4">
              <Panel
                title="Upcoming"
                description="This group's own events. All-church ones are on the calendar."
                bodyClassName="p-0"
              >
                {events.upcoming.length === 0 ? (
                  <EmptyState
                    icon={<CalendarDaysIcon className="size-5" aria-hidden />}
                    title="Nothing planned"
                  >
                    The group&apos;s next event will appear here.
                  </EmptyState>
                ) : (
                  <ul className="divide-border divide-y">
                    {events.upcoming.map((event) => (
                      <EventListItem key={event.id} event={event} />
                    ))}
                  </ul>
                )}
              </Panel>
              {events.past.length > 0 && (
                <Panel title="Recent" bodyClassName="p-0">
                  <ul className="divide-border divide-y">
                    {events.past.map((event) => (
                      <EventListItem key={event.id} event={event} muted />
                    ))}
                  </ul>
                </Panel>
              )}
            </div>
          )}

          {prayer && (
            <div className="grid gap-4">
              {prayer.canPost && (
                <Panel>
                  <PrayerForm groupId={group.id} groupName={group.name} />
                </Panel>
              )}
              <Panel
                title="Prayer requests"
                description="Pinned first, then newest."
                bodyClassName="p-0"
              >
                <PrayerList items={prayer.items} />
              </Panel>
            </div>
          )}

          {active === "manage" && group.viewer.manages && (
            <div className="grid gap-4">
              <Panel
                title="Leader"
                description="The leader can message the group and see members' contact details."
              >
                <LeaderForm
                  groupId={group.id}
                  leaderId={group.leader?.id ?? null}
                  people={people.all}
                />
              </Panel>
              <Panel title="Add members">
                <AddMembersForm groupId={group.id} people={people.notInGroup} />
              </Panel>
              <Panel title="Details">
                <GroupForm
                  groupId={group.id}
                  stored={{
                    name: group.name,
                    audience: group.audience,
                    description: group.description,
                  }}
                />
              </Panel>
              <Panel title="Delete group">
                <DeleteGroupForm groupId={group.id} name={group.name} />
              </Panel>
            </div>
          )}
        </div>
      </PageGrid>
    </>
  );
}
