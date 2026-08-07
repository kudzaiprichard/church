import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/dal";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the member area.",
};

export default async function LoginPage() {
  // Somebody already signed in has no business on this page.
  const session = await getSession();
  if (session) redirect(session.mustChangePassword ? "/change-password" : "/dashboard");

  return (
    <>
      <h1 className="text-3xl leading-tight">Sign in</h1>
      <p className="text-muted-foreground mt-3 mb-9 text-sm text-pretty">
        Accounts are created by the church office. If you do not have one yet, speak to them and an
        invitation will be sent to your email.
      </p>

      <LoginForm />
    </>
  );
}
