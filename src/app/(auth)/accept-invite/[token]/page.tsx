import type { Metadata } from "next";
import Link from "next/link";

import { acceptInvite } from "@/app/(auth)/actions";
import { SetPasswordForm } from "@/app/(auth)/_components/set-password-form";
import { inspectAuthToken } from "@/lib/auth/auth-tokens";

export const metadata: Metadata = { title: "Set up your account" };

/**
 * The end of an invitation.
 *
 * The token is only inspected here, never spent — somebody who opens the link
 * and then closes the tab must still be able to use it. It is consumed by the
 * action, at the moment a password is actually set.
 */
export default async function AcceptInvitePage({ params }: PageProps<"/accept-invite/[token]">) {
  const { token } = await params;
  const checked = await inspectAuthToken(token, "INVITE");

  if (!checked.ok) {
    return (
      <>
        <h1 className="text-navy text-2xl leading-tight font-bold">This link is no longer valid</h1>
        <p className="text-muted-foreground mt-3 text-sm text-pretty">
          {checked.reason === "expired"
            ? "Invitations last seven days, and this one has passed that."
            : checked.reason === "used"
              ? "It has already been used to set a password. Try signing in."
              : "It may have been copied incompletely, or replaced by a newer invitation."}
        </p>
        <p className="text-muted-foreground mt-6 text-sm text-pretty">
          Ask the church office to send a new one.
        </p>
        <Link
          href="/login"
          className="focus-visible:ring-ring mt-8 inline-block rounded-sm text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          Go to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-navy text-2xl leading-tight font-bold">Set up your account</h1>
      <p className="text-muted-foreground mt-3 mb-9 text-sm text-pretty">
        Choose a password and you are in. Nobody at the church can see it — if you forget it, you
        will be sent a link to set a new one.
      </p>

      <SetPasswordForm action={acceptInvite.bind(null, token)} submitLabel="Create my account" />
    </>
  );
}
