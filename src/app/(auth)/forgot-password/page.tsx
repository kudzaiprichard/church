import type { Metadata } from "next";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Forgotten password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-navy text-2xl leading-tight font-bold">Forgotten password</h1>
      <p className="text-muted-foreground mt-3 mb-9 text-sm text-pretty">
        Enter the email address your account uses and we will send you a link to set a new password.
      </p>

      <ForgotPasswordForm />
    </>
  );
}
