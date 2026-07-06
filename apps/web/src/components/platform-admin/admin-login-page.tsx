"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { createPlatformAdminApiClient } from "../../lib/api/platform-admin-client";
import { saveAdminSession } from "../../lib/admin-session";
import { FormMessage } from "../auth/auth-page-shell";

export function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const client = useMemo(() => createPlatformAdminApiClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const session = await client.login({ email, password });
      saveAdminSession(session);
      router.push(searchParams?.get("next") ?? "/admin");
    } catch {
      setError("Invalid admin email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-auth-page">
      <section className="panel admin-auth-card">
        <Link className="public-brand" href="/" aria-label="Salense home">
          <Image alt="Salense" height={44} priority src="/brand/salense-logo-dark.svg" width={142} />
        </Link>
        <div>
          <p className="eyebrow">Platform administration</p>
          <h1>Sign in to Salense Admin</h1>
          <p>
            This area is for internal Salense platform administrators who review access requests
            and manage platform operations.
          </p>
        </div>
        {searchParams?.get("reason") === "session-expired" ? (
          <FormMessage tone="info">Your admin session expired. Please sign in again.</FormMessage>
        ) : null}
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            Admin email
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
        <Link href="/login">Customer workspace login</Link>
      </section>
    </main>
  );
}
