"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { createAuthApiClient } from "../../lib/api/auth-client";
import { AuthPageShell, FormMessage } from "./auth-page-shell";

export function ForgotPasswordForm() {
  const authClient = useMemo(() => createAuthApiClient(), []);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await authClient.requestPasswordReset(email);
      setSuccess(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to request reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Account recovery"
      footer={<Link href="/login">Back to login</Link>}
      summary="Request a secure reset link. The response stays generic so account existence is not revealed."
      title="Reset your password"
    >
      {success ? (
        <FormMessage tone="success">
          If the email exists, a password reset link has been prepared.
        </FormMessage>
      ) : null}
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Email address
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "Requesting..." : "Request reset link"}
        </button>
      </form>
    </AuthPageShell>
  );
}
