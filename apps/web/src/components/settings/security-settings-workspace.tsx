"use client";

import { AlertCircle, KeyRound, Loader2, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { createAuthApiClient, type CurrentUserResponse } from "../../lib/api/auth-client";
import {
  clearDemoSession,
  getFriendlyAuthErrorMessage,
  readDemoSession,
  type DemoSession,
} from "../../lib/auth-session";
import { FormMessage } from "../auth/auth-page-shell";

export function SecuritySettingsWorkspace() {
  const authClient = useMemo(() => createAuthApiClient(), []);
  const router = useRouter();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSecurity() {
      const currentSession = readDemoSession();

      if (!currentSession) {
        setPageError("Sign in to view security settings.");
        setLoading(false);
        return;
      }

      setSession(currentSession);

      try {
        const currentUser = await authClient.getCurrentUser(currentSession.accessToken);

        if (!mounted) {
          return;
        }

        setUser(currentUser);
        setPageError(null);
      } catch (caughtError) {
        if (!mounted) {
          return;
        }

        setPageError(getFriendlyError(caughtError));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadSecurity();

    return () => {
      mounted = false;
    };
  }, [authClient]);

  async function handleSignOut() {
    const currentSession = readDemoSession();
    setSigningOut(true);

    try {
      if (currentSession) {
        await authClient.logout(currentSession.refreshToken);
      }
    } catch {
      // Signing out should still clear the local browser session if the server token has expired.
    } finally {
      clearDemoSession();
      setSigningOut(false);
      router.push("/login");
    }
  }

  return (
    <main className="workspace settings-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Security settings</p>
          <h1>Security</h1>
          <p>
            Manage sign-in protection, password access, email verification, and the current browser
            session for this Salense workspace.
          </p>
        </div>
        <Link className="secondary-button" href="/settings">
          Back to Settings
        </Link>
      </header>

      {loading ? (
        <section className="today-loading" aria-label="Loading security settings">
          <Loader2 className="spin" size={24} aria-hidden="true" />
          <span>Loading security settings...</span>
        </section>
      ) : null}

      {pageError ? (
        <section className="state-banner error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {pageError}
        </section>
      ) : null}

      {!loading && !pageError ? (
        <div className="settings-detail-grid">
          <section className="panel settings-detail-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  <ShieldCheck size={18} aria-hidden="true" />
                  Security status
                </h2>
                <p>Current account protection signals.</p>
              </div>
            </div>
            <dl className="settings-detail-list">
              <DetailRow label="Password status" value="Password protected" />
              <DetailRow
                label="Email verification"
                value={user?.emailVerified ? "Verified" : "Needs verification"}
              />
              <DetailRow label="Signed-in email" value={user?.email ?? "Not available"} />
              <DetailRow
                label="Access token lifetime"
                value={session?.accessTokenExpiresIn || "Managed by server policy"}
              />
              <DetailRow
                label="Refresh token lifetime"
                value={session?.refreshTokenExpiresIn || "Managed by server policy"}
              />
            </dl>
          </section>

          <ChangePasswordPanel />

          <section className="panel settings-note-panel">
            <LogOut size={20} aria-hidden="true" />
            <div>
              <h2>Current browser session</h2>
              <p>
                Sign out on this browser when you are finished. Marketplace connections and
                synchronised commerce records remain unchanged.
              </p>
              <button
                className="secondary-button"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
                type="button"
              >
                <LogOut size={16} aria-hidden="true" />
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function ChangePasswordPanel() {
  const authClient = useMemo(() => createAuthApiClient(), []);
  const [form, setForm] = useState({
    confirmNewPassword: "",
    currentPassword: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const session = readDemoSession();

    if (!session) {
      setLoading(false);
      setError("Sign in before changing your password.");
      return;
    }

    try {
      await authClient.changePassword(session.accessToken, form);
      clearDemoSession();
      setForm({ confirmNewPassword: "", currentPassword: "", newPassword: "" });
      setSuccess("Password changed. Sign in again to continue securely.");
    } catch (caughtError) {
      setError(getFriendlyError(caughtError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel settings-detail-panel">
      <div className="panel-heading">
        <div>
          <h2>
            <KeyRound size={18} aria-hidden="true" />
            Change password
          </h2>
          <p>Update your password using the current account password.</p>
        </div>
      </div>
      {success ? <FormMessage tone="success">{success}</FormMessage> : null}
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Current password
          <input
            autoComplete="current-password"
            onChange={(event) =>
              setForm((current) => ({ ...current, currentPassword: event.target.value }))
            }
            required
            type="password"
            value={form.currentPassword}
          />
        </label>
        <label>
          New password
          <input
            autoComplete="new-password"
            minLength={12}
            onChange={(event) =>
              setForm((current) => ({ ...current, newPassword: event.target.value }))
            }
            required
            type="password"
            value={form.newPassword}
          />
        </label>
        <label>
          Confirm new password
          <input
            autoComplete="new-password"
            minLength={12}
            onChange={(event) =>
              setForm((current) => ({ ...current, confirmNewPassword: event.target.value }))
            }
            required
            type="password"
            value={form.confirmNewPassword}
          />
        </label>
        <p className="form-note">
          Use at least 12 characters with uppercase, lowercase, number, and special character.
        </p>
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "Changing password..." : "Change password"}
        </button>
      </form>
    </section>
  );
}

function DetailRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function getFriendlyError(error: unknown): string {
  const authMessage = getFriendlyAuthErrorMessage(error);

  if (authMessage) {
    return authMessage;
  }

  return error instanceof Error ? error.message : "Unable to load security settings.";
}
