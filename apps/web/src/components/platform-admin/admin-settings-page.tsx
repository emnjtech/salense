"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  createPlatformAdminApiClient,
  type PlatformAdminProfile,
} from "../../lib/api/platform-admin-client";
import { clearAdminSession, readAdminSession } from "../../lib/admin-session";
import { FormMessage } from "../auth/auth-page-shell";

export function AdminSettingsPage() {
  const router = useRouter();
  const client = useMemo(() => createPlatformAdminApiClient(), []);
  const [profile, setProfile] = useState<PlatformAdminProfile | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const session = readAdminSession();

    if (!session) {
      router.replace("/admin/login?next=/admin/settings");
      return;
    }

    client
      .getProfile()
      .then((response) => {
        if (mounted) {
          setProfile(response);
        }
      })
      .catch(() => {
        clearAdminSession();
        router.replace("/admin/login?next=/admin/settings");
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [client, router]);

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      await client.changePassword(undefined, {
        confirmNewPassword,
        currentPassword,
        newPassword,
      });
      clearAdminSession();
      setMessage("Password updated. Please sign in again.");
      router.replace("/admin/login");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Password could not be changed.");
    }
  }

  async function signOut() {
    const session = readAdminSession();

    try {
      if (session?.refreshToken) {
        await client.logout(session.refreshToken);
      }
    } finally {
      clearAdminSession();
      router.replace("/admin/login");
    }
  }

  return (
    <main className="workspace admin-invitations-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Platform administration</p>
          <h1>Admin settings</h1>
          <p>Manage your internal Salense administrator profile and account security.</p>
        </div>
        <button className="secondary-button" onClick={() => void signOut()} type="button">
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </header>

      {loading ? (
        <section className="panel">Loading admin settings...</section>
      ) : (
        <section className="settings-detail-grid">
          <article className="panel settings-detail-card">
            <ShieldCheck size={22} aria-hidden="true" />
            <p className="eyebrow">Profile</p>
            <h2>{profile ? `${profile.firstName} ${profile.lastName}` : "Admin profile"}</h2>
            <dl className="settings-summary-list">
              <div>
                <dt>Email</dt>
                <dd>{profile?.email ?? "Unavailable"}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{profile?.role === "SUPER_ADMIN" ? "Super admin" : "Unavailable"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{profile?.status ?? "Unavailable"}</dd>
              </div>
            </dl>
          </article>

          <article className="panel settings-detail-card">
            <p className="eyebrow">Security</p>
            <h2>Change password</h2>
            {message ? <FormMessage tone="success">{message}</FormMessage> : null}
            {error ? <FormMessage tone="error">{error}</FormMessage> : null}
            <form className="auth-form" onSubmit={(event) => void handlePasswordChange(event)}>
              <label>
                Current password
                <input
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  type="password"
                  value={currentPassword}
                />
              </label>
              <label>
                New password
                <input
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  type="password"
                  value={newPassword}
                />
              </label>
              <label>
                Confirm new password
                <input
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  required
                  type="password"
                  value={confirmNewPassword}
                />
              </label>
              <button className="primary-button" type="submit">
                Update password
              </button>
            </form>
          </article>
        </section>
      )}
    </main>
  );
}
