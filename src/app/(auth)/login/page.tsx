import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/dal";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the member area.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Somebody already signed in has no business on this page.
  const session = await getSession();
  if (session) redirect(session.mustChangePassword ? "/change-password" : "/dashboard");

  const { next } = await searchParams;

  return (
    <>
      <h1 className="text-navy text-2xl leading-tight font-bold">Sign in</h1>
      <p className="text-muted-foreground mt-3 mb-9 text-sm text-pretty">
        Accounts are created by the church office. If you do not have one yet, speak to them and an
        invitation will be sent to your email.
      </p>

      <LoginForm next={typeof next === "string" ? next : undefined} />

      {/*
        A labelled way back to the public site.

        The wordmark above this already links to `/`, but a logo is a
        convention people have to know rather than something they can read —
        and the visitor most likely to be stuck here is the one who followed
        "Sign in" out of curiosity and has no account. This screen tells them
        accounts come from the church office, so it should also give them
        somewhere to go once they have read that.
      */}
      <Link
        href="/"
        className="focus-visible:ring-ring text-muted-foreground hover:text-foreground border-border mt-8 flex items-center gap-2 border-t pt-5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <span aria-hidden>&larr;</span>
        Back to the site
      </Link>
    </>
  );
}
