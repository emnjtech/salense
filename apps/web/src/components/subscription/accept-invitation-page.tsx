"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createSubscriptionApiClient,
  type InvitationContext,
} from "../../lib/api/subscription-client";

interface AcceptInvitationPageProps {
  readonly token?: string | undefined;
}

export function AcceptInvitationPage({ token }: AcceptInvitationPageProps) {
  const router = useRouter();
  const client = useMemo(() => createSubscriptionApiClient(), []);
  const [context, setContext] = useState<InvitationContext | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadContext() {
      if (!token) {
        setError("This invitation link is missing a token.");
        setLoadingContext(false);
        return;
      }

      try {
        const response = await client.getInvitationContext(token);

        if (mounted) {
          setContext(response);
          setFirstName(response.fullName.split(" ")[0] ?? "");
          setLastName(response.fullName.split(" ").slice(1).join(" "));
        }
      } catch {
        if (mounted) {
          setError("This invitation link is invalid, expired, or already used.");
        }
      } finally {
        if (mounted) {
          setLoadingContext(false);
        }
      }
    }

    void loadContext();

    return () => {
      mounted = false;
    };
  }, [client, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await client.acceptInvitation({
        confirmPassword,
        firstName,
        lastName,
        password,
        token,
      });
      setCreatedEmail(response.email);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "We could not create your account. Please check the details and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="public-page invitation-page accept-invitation-page">
      <header className="public-nav">
        <Link className="public-brand" href="/" aria-label="Salense home">
          <Image
            alt="Salense"
            height={44}
            priority
            src="/brand/salense-logo-dark.svg"
            width={142}
          />
        </Link>
        <Link className="secondary-button" href="/login">
          Login
        </Link>
      </header>

      <section className="invitation-layout">
        <div className="invitation-copy">
          <p className="eyebrow">Private access</p>
          <h1>Create your Salense account.</h1>
          <p>
            Your business has been approved for private access. Set your password to activate the
            workspace and continue to login.
          </p>
          {context ? (
            <div className="panel invitation-plan-summary">
              <span>Approved business</span>
              <strong>{context.businessName}</strong>
              <p>{context.workEmail}</p>
            </div>
          ) : null}
        </div>

        {createdEmail ? (
          <section className="panel invitation-confirmation" role="status">
            <CheckCircle2 size={34} aria-hidden="true" />
            <p className="eyebrow">Account created</p>
            <h1>Your Salense account is ready.</h1>
            <p>
              The account for {createdEmail} has been created and verified through private access.
              You can now sign in.
            </p>
            <button className="primary-button" onClick={() => router.push("/login")} type="button">
              Continue to login
            </button>
          </section>
        ) : (
          <form className="panel auth-form accept-invitation-form" onSubmit={handleSubmit}>
            {loadingContext ? (
              <div className="today-loading">
                <Loader2 className="spin" size={18} aria-hidden="true" />
                Checking invitation...
              </div>
            ) : null}

            {error ? (
              <div className="form-message error" role="alert">
                {error}
              </div>
            ) : null}

            <label>
              First name
              <input
                autoComplete="given-name"
                disabled={!context || submitting}
                onChange={(event) => setFirstName(event.target.value)}
                required
                value={firstName}
              />
            </label>
            <label>
              Last name
              <input
                autoComplete="family-name"
                disabled={!context || submitting}
                onChange={(event) => setLastName(event.target.value)}
                required
                value={lastName}
              />
            </label>
            <label>
              Password
              <input
                autoComplete="new-password"
                disabled={!context || submitting}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <label>
              Confirm password
              <input
                autoComplete="new-password"
                disabled={!context || submitting}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </label>
            <p className="form-note">
              Private-access accounts are approved by Salense and start with email verification
              complete.
            </p>
            <button className="primary-button" disabled={!context || submitting} type="submit">
              {submitting ? <Loader2 className="spin" size={16} aria-hidden="true" /> : null}
              Create account
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
