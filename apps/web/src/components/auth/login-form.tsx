"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { createAuthApiClient } from "../../lib/api/auth-client";
import { saveDemoSession } from "../../lib/auth-session";
import { AuthPageShell, FormMessage } from "./auth-page-shell";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authClient = useMemo(() => createAuthApiClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const session = await authClient.login({ email, password });
      saveDemoSession(session);
      router.push(searchParams?.get("next") ?? "/today");
    } catch (caughtError) {
      setError(getMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Welcome back"
      footer={
        <>
          <Link href="/forgot-password">Forgot password?</Link>
          <span>New to Salense?</span>
          <Link href="/request-invitation">Request invitation</Link>
        </>
      }
      summary="Login to continue to your Salense workspace. Private access is available by invitation."
      title="Sign in to Salense"
    >
      {searchParams?.get("verified") === "true" ? (
        <FormMessage tone="success">Email verified. You can sign in now.</FormMessage>
      ) : null}
      {searchParams?.get("reason") === "session-expired" ? (
        <FormMessage tone="info">Your session expired. Please sign in again.</FormMessage>
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
        <label>
          Password
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthPageShell>
  );
}

function getMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to sign in.";
}
