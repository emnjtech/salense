"use client";

import { AlertCircle, Building2, Loader2, Mail, UserCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createAuthApiClient,
  type CompanyProfileResponse,
  type CurrentUserResponse,
} from "../../lib/api/auth-client";
import { getFriendlyAuthErrorMessage, readDemoSession } from "../../lib/auth-session";

export function AccountSettingsWorkspace() {
  const authClient = useMemo(() => createAuthApiClient(), []);
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [profile, setProfile] = useState<CompanyProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAccount() {
      const session = readDemoSession();

      if (!session) {
        setLoading(false);
        setError("Sign in to view account settings.");
        return;
      }

      try {
        const [currentUser, companyProfile] = await Promise.all([
          authClient.getCurrentUser(session.accessToken),
          authClient.getCompanyProfile(session.accessToken).catch(() => null),
        ]);

        if (!mounted) {
          return;
        }

        setUser(currentUser);
        setProfile(companyProfile);
        setError(null);
      } catch (caughtError) {
        if (!mounted) {
          return;
        }

        setError(getFriendlyError(caughtError));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadAccount();

    return () => {
      mounted = false;
    };
  }, [authClient]);

  return (
    <main className="workspace settings-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Account settings</p>
          <h1>Account</h1>
          <p>Review the user and business profile details attached to this Salense workspace.</p>
        </div>
        <Link className="secondary-button" href="/settings">
          Back to Settings
        </Link>
      </header>

      {loading ? (
        <section className="today-loading" aria-label="Loading account settings">
          <Loader2 className="spin" size={24} aria-hidden="true" />
          <span>Loading account settings...</span>
        </section>
      ) : null}

      {error ? (
        <section className="state-banner error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {error}
        </section>
      ) : null}

      {!loading && !error ? <AccountSettingsDetails profile={profile} user={user} /> : null}
    </main>
  );
}

export function AccountSettingsDetails({
  profile,
  user,
}: {
  readonly profile: CompanyProfileResponse | null;
  readonly user: CurrentUserResponse | null;
}) {
  return (
    <div className="settings-detail-grid">
      <section className="panel settings-detail-panel">
        <div className="panel-heading">
          <div>
            <h2>
              <UserCircle size={18} aria-hidden="true" />
              User profile
            </h2>
            <p>Your identity for the Salense workspace.</p>
          </div>
        </div>
        <dl className="settings-detail-list">
          <DetailRow label="First name" value={user?.firstName ?? "Not available"} />
          <DetailRow label="Last name" value={user?.lastName ?? "Not available"} />
          <DetailRow label="Email" value={user?.email ?? "Not available"} />
          <DetailRow
            label="Email verification"
            value={user?.emailVerified ? "Verified" : "Needs verification"}
          />
        </dl>
      </section>

      <section className="panel settings-detail-panel">
        <div className="panel-heading">
          <div>
            <h2>
              <Building2 size={18} aria-hidden="true" />
              Business profile
            </h2>
            <p>Business context used across commerce intelligence views.</p>
          </div>
          <Link className="secondary-button" href="/company-profile">
            Edit profile
          </Link>
        </div>
        <dl className="settings-detail-list">
          <DetailRow label="Business name" value={profile?.businessName ?? "Not configured"} />
          <DetailRow label="Country" value={profile?.country ?? "Not configured"} />
          <DetailRow label="Currency" value={profile?.currency ?? "Not configured"} />
          <DetailRow label="Time zone" value={profile?.timeZone ?? "Not configured"} />
          <DetailRow label="Industry" value={profile?.industry ?? "Not configured"} />
        </dl>
      </section>

      <section className="panel settings-note-panel">
        <Mail size={20} aria-hidden="true" />
        <div>
          <h2>Profile data stays private</h2>
          <p>
            Account and business profile information is used to personalise the workspace and keep
            analytics tied to the correct business. Marketplace credentials and raw platform
            payloads are never shown here.
          </p>
        </div>
      </section>
    </div>
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

  return error instanceof Error ? error.message : "Unable to load account settings.";
}
