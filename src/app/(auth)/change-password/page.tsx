import type { Metadata } from "next";

import { requireSession } from "@/lib/auth/dal";

import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = {
  title: "Change your password",
};

export default async function ChangePasswordPage() {
  // The one screen a user carrying `mustChangePassword` is allowed to reach —
  // hence the flag, or the guard would redirect this page to itself.
  const user = await requireSession({ allowPasswordChange: true });
  const forced = user.mustChangePassword;

  return (
    <>
      <h1 className="text-navy text-2xl leading-tight font-bold">
        {forced ? "Choose a new password" : "Change your password"}
      </h1>
      <p className="text-muted-foreground mt-3 mb-9 text-sm text-pretty">
        {forced
          ? "This account is using a password somebody else set for it. Choose your own before carrying on."
          : "You will be signed out of any other browsers you are signed in on."}
      </p>

      <ChangePasswordForm forced={forced} />
    </>
  );
}
