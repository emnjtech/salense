"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { createAuthApiClient } from "../../lib/api/auth-client";
import { AuthPageShell, FormMessage } from "./auth-page-shell";

export function ResetPasswordForm() {
  const tokenFromUrl = useSearchParams()?.get("token") ?? "";
  const authClient = useMemo(() => createAuthApiClient(), []);
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await authClient.confirmPasswordReset({ confirmPassword, password, token });
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Secure reset"
      footer={<Link href="/login">Back to login</Link>}
      summary="Choose a new password that meets the Chapter 6.1 policy."
      title="Set a new password"
    >
      {success ? (
        <FormMessage tone="success">Password reset. You can sign in now.</FormMessage>
      ) : null}
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Reset token
          <input
            autoComplete="one-time-code"
            onChange={(event) => setToken(event.target.value)}
            required
            value={token}
          />
        </label>
        <label>
          New password
          <input
            autoComplete="new-password"
            minLength={12}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <label>
          Confirm new password
          <input
            autoComplete="new-password"
            minLength={12}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </label>
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </AuthPageShell>
  );
}
