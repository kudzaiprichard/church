import type { Metadata } from "next";
import Link from "next/link";

import { resetPassword } from "@/app/(auth)/actions";
import { SetPasswordForm } from "@/app/(auth)/_components/set-password-form";
import { inspectAuthToken } from "@/lib/auth/auth-tokens";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({ params }: PageProps<"/reset-password/[token]">) {
  const { token } = await params;
  const checked = await inspectAuthToken(token, "PASSWORD_RESET");

  if (!checked.ok) {
    return (
      <>
        <h1 className="text-navy text-2xl leading-tight font-bold">This link is no longer valid</h1>
        <p className="text-muted-foreground mt-3 text-sm text-pretty">
          {checked.reason === "expired"
            ? "Reset links last an hour, and this one has passed that."
            : checked.reason === "used"
              ? "It has already been used. If that was not you, ask the church office to look at the account."
              : "It may have been copied incompletely, or replaced by a newer request."}
        </p>
        <Link
          href="/forgot-password"
          className="focus-visible:ring-ring mt-8 inline-block rounded-sm text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          Ask for a new link
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-navy text-2xl leading-tight font-bold">Set a new password</h1>
      <p className="text-muted-foreground mt-3 mb-9 text-sm text-pretty">
        Once this is saved you will be signed out everywhere else and signed in here.
      </p>

      <SetPasswordForm action={resetPassword.bind(null, token)} submitLabel="Save password" />
    </>
  );
}
