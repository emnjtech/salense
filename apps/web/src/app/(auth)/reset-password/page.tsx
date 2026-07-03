import { Suspense } from "react";
import { ResetPasswordForm } from "../../../components/auth/reset-password-form";

export const metadata = {
  title: "Reset password | Salense",
};

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
