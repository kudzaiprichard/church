import type { Gender, Role } from "@/generated/prisma/enums";
import { ROLES, ROLE_LABELS } from "@/lib/auth/permissions";
import type { BaptismDto, GroupRef } from "@/lib/data/members";

import {
  CheckboxGroupField,
  FormSection,
  GENDER_OPTIONS,
  SelectField,
  TextAreaField,
  TextField,
} from "../_components/form-fields";

export type MemberDefaults = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  role?: Role;
  groupIds?: readonly string[];
  baptism?: BaptismDto | null;
};

/**
 * Every field of a member record, in the order the office fills them in.
 *
 * Shared by enrolment and the Apostle's edit so the two can never disagree
 * about what a member record holds. The field names are the ones
 * `memberFormValues()` reads on the server.
 */
export function MemberFields({
  groups,
  defaults = {},
  errors = {},
  today,
  showOffice,
  baptismRequired,
}: {
  groups: GroupRef[];
  defaults?: MemberDefaults;
  errors?: Record<string, string>;
  /** Harare's today, as the `max` for the date pickers. */
  today: string;
  /** Only an Apostle chooses an office; everyone else enrols Members. */
  showOffice: boolean;
  baptismRequired: boolean;
}) {
  return (
    <div className="grid gap-6">
      <FormSection title="Personal details">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="firstName"
            name="firstName"
            label="First name"
            required
            defaultValue={defaults.firstName}
            error={errors.firstName}
          />
          <TextField
            id="lastName"
            name="lastName"
            label="Last name"
            required
            defaultValue={defaults.lastName}
            error={errors.lastName}
          />
          <TextField
            id="email"
            name="email"
            type="email"
            label="Email"
            required
            defaultValue={defaults.email}
            error={errors.email}
            hint="Their sign-in address. The invitation is sent here."
          />
          <TextField
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            label="Phone"
            defaultValue={defaults.phone}
            error={errors.phone}
          />
          <TextField
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            label="Date of birth"
            max={today}
            defaultValue={defaults.dateOfBirth}
            error={errors.dateOfBirth}
          />
          <SelectField
            id="gender"
            name="gender"
            label="Gender"
            placeholder="Not given"
            options={GENDER_OPTIONS}
            defaultValue={defaults.gender}
            error={errors.gender}
          />
        </div>
        <TextAreaField
          id="address"
          name="address"
          label="Address"
          rows={2}
          defaultValue={defaults.address}
          error={errors.address}
        />
      </FormSection>

      <FormSection
        title="Church"
        description="Which connect groups they belong to. A member may be in more than one."
      >
        {groups.length === 0 ? (
          <p className="bg-destructive/10 text-destructive rounded-lg px-3.5 py-3 text-sm">
            No connect groups exist yet. Run the database seed (<code>npm run db:seed</code>) to
            create the seven groups.
          </p>
        ) : (
          <CheckboxGroupField
            id="groupIds"
            name="groupIds"
            label="Connect groups"
            required
            options={groups.map((group) => ({ value: group.id, label: group.name }))}
            defaultValues={defaults.groupIds}
            error={errors.groupIds}
          />
        )}

        {showOffice && (
          <SelectField
            id="role"
            name="role"
            label="Office"
            options={ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
            defaultValue={defaults.role ?? "MEMBER"}
            error={errors.role}
            hint="Apostles see everything; the Matron enrols and keeps baptismal records; the Elder oversees church finance. Most people are Members."
          />
        )}
      </FormSection>

      <FormSection
        title="Baptism"
        description={
          baptismRequired
            ? "Only baptized members can be enrolled. The date, the place and who baptized them are required."
            : "This account has no baptismal record yet. Fill in all three required fields to add one, or leave them empty."
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="baptismDate"
            name="baptismDate"
            type="date"
            label="Baptism date"
            required={baptismRequired}
            max={today}
            defaultValue={defaults.baptism?.baptismDate}
            error={errors.baptismDate}
          />
          <TextField
            id="classCompletedOn"
            name="classCompletedOn"
            type="date"
            label="Baptismal class completed"
            max={today}
            defaultValue={defaults.baptism?.classCompletedOn}
            error={errors.classCompletedOn}
          />
          <TextField
            id="baptismLocation"
            name="baptismLocation"
            label="Where"
            required={baptismRequired}
            defaultValue={defaults.baptism?.location}
            error={errors.baptismLocation}
          />
          <TextField
            id="conductedBy"
            name="conductedBy"
            label="Conducted by"
            required={baptismRequired}
            defaultValue={defaults.baptism?.conductedBy}
            error={errors.conductedBy}
          />
        </div>
        <TextAreaField
          id="baptismNotes"
          name="baptismNotes"
          label="Notes"
          rows={2}
          defaultValue={defaults.baptism?.notes}
          error={errors.baptismNotes}
        />
      </FormSection>
    </div>
  );
}
