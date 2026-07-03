"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { createAuthApiClient } from "../../lib/api/auth-client";
import { AuthPageShell, FormMessage } from "./auth-page-shell";

export function RegisterForm() {
  const authClient = useMemo(() => createAuthApiClient(), []);
  const [form, setForm] = useState({
    companyName: "",
    confirmPassword: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setRegisteredEmail(null);

    try {
      const response = await authClient.register(form);
      setRegisteredEmail(response.user.email);
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Create account"
      footer={
        <>
          <span>Already registered?</span>
          <Link href="/login">Sign in</Link>
        </>
      }
      summary="Create the owner account and starter business profile. Login stays locked until email verification is complete."
      title="Start your Salense workspace"
    >
      {registeredEmail ? (
        <FormMessage tone="success">
          Account created for {registeredEmail}. Check the verification email before signing in.
        </FormMessage>
      ) : null}
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <form className="auth-form two-column" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          First name
          <input
            autoComplete="given-name"
            onChange={(event) =>
              setForm((current) => ({ ...current, firstName: event.target.value }))
            }
            required
            value={form.firstName}
          />
        </label>
        <label>
          Last name
          <input
            autoComplete="family-name"
            onChange={(event) =>
              setForm((current) => ({ ...current, lastName: event.target.value }))
            }
            required
            value={form.lastName}
          />
        </label>
        <label className="span-two">
          Email address
          <input
            autoComplete="email"
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
            type="email"
            value={form.email}
          />
        </label>
        <label className="span-two">
          Company name
          <input
            autoComplete="organization"
            onChange={(event) =>
              setForm((current) => ({ ...current, companyName: event.target.value }))
            }
            required
            value={form.companyName}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="new-password"
            minLength={12}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            required
            type="password"
            value={form.password}
          />
        </label>
        <label>
          Confirm password
          <input
            autoComplete="new-password"
            minLength={12}
            onChange={(event) =>
              setForm((current) => ({ ...current, confirmPassword: event.target.value }))
            }
            required
            type="password"
            value={form.confirmPassword}
          />
        </label>
        <p className="form-note span-two">
          Use at least 12 characters with uppercase, lowercase, number, and special character.
        </p>
        <button className="primary-button span-two" disabled={loading} type="submit">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthPageShell>
  );
}
