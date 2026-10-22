import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireSession } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { getOwnProfile } from "@/lib/data/members";
import { formatDateOnly, harareToday } from "@/lib/dates";
import { storageIsConfigured } from "@/lib/storage";

import { PageHeader, Panel } from "../_components/page-parts";

import { AvatarForm } from "./avatar-form";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

const joined = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Harare",
});

/**
 * Your own church record (docs/SCOPE.md §9.3).
 *
 * Read straight from the session's own row, so there is nothing to scope and
 * no id that could be swapped for somebody else's. Sign-in, password and
 * devices stay on the Account page; this is the church's record of you.
 */
export default async function ProfilePage() {
  const user = await requireSession();
  const profile = await getOwnProfile(user);

  return (
    <>
      <PageHeader
        eyebrow="You"
        title="Your profile"
        description="Your record on the church roll. You can keep your contact details and birthday up to date here; your name and email are changed by the church office."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel
          title="Your details"
          description="Your phone number is visible to the leaders of your groups and the church office; your address, date of birth and gender only to the Apostles."
        >
          <ProfileForm
            today={harareToday()}
            stored={{
              phone: profile.phone,
              address: profile.address,
              dateOfBirth: profile.dateOfBirth,
              gender: profile.gender,
            }}
          />
        </Panel>

        <div className="grid gap-4">
          <Panel title="Photo" description="Shown beside your name to your groups and the church office.">
            <AvatarForm
              avatarUrl={user.avatarUrl}
              initials={`${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()}
              uploads={storageIsConfigured}
            />
          </Panel>
          <Panel title="On the roll">
            <dl className="grid gap-4">
              <Detail label="Name">
                {profile.firstName} {profile.lastName}
              </Detail>
              <Detail label="Email">{profile.email}</Detail>
              <Detail label="Office">{ROLE_LABELS[user.role]}</Detail>
              <Detail label="Member since">{joined.format(new Date(profile.joinedAt))}</Detail>
              <Detail label="Connect groups">
                {profile.groups.length > 0
                  ? profile.groups.map((group) => group.name).join(", ")
                  : null}
              </Detail>
            </dl>
          </Panel>

          <Panel title="Baptism">
            {profile.baptism ? (
              <dl className="grid gap-4">
                <Detail label="Baptized on">{formatDateOnly(profile.baptism.baptismDate)}</Detail>
                <Detail label="Where">{profile.baptism.location}</Detail>
                <Detail label="Conducted by">{profile.baptism.conductedBy}</Detail>
                <Detail label="Certificate">
                  {profile.baptism.certificateNumber
                    ? `Issued — ${profile.baptism.certificateNumber}`
                    : "Not issued yet. The church office issues it."}
                </Detail>
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm text-pretty">
                No baptismal record is held for you yet. Speak to Minister Winnie if that is a
                mistake.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-foreground mt-1 text-sm break-words">
        {children || <span className="text-muted-foreground">Not recorded</span>}
      </dd>
    </div>
  );
}
