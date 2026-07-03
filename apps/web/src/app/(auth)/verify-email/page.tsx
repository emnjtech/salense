import { Suspense } from "react";
import { EmailVerificationResult } from "../../../components/auth/email-verification-result";

export const metadata = {
  title: "Email verification | Salense",
};

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <EmailVerificationResult />
    </Suspense>
  );
}
