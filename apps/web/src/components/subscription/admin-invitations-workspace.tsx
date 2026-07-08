"use client";

import { Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createSubscriptionApiClient,
  type AdminInvitation,
} from "../../lib/api/subscription-client";
import { readAdminSession } from "../../lib/admin-session";

export function AdminInvitationsWorkspace() {
  const router = useRouter();
  const client = useMemo(() => createSubscriptionApiClient(), []);
  const [invitations, setInvitations] = useState<readonly AdminInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadInvitations() {
      if (!readAdminSession()) {
        router.replace("/admin/login?next=/admin");
        return;
      }

      try {
        const response = await client.listInvitations();

        if (mounted) {
          setInvitations(response.invitations);
          setError(null);
        }
      } catch {
        if (mounted) {
          setError("You do not have access to invitation administration.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadInvitations();

    return () => {
      mounted = false;
    };
  }, [client, router]);

  return (
    <main className="workspace admin-invitations-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Private access</p>
          <h1>Invitation requests</h1>
          <p>
            Review selected businesses, approve access, and issue single-use account creation
            links for Salense.
          </p>
        </div>
        <Link className="secondary-button" href="/admin/settings">
          Admin settings
        </Link>
      </header>

      {error ? (
        <section className="state-banner error" role="alert">
          {error}
        </section>
      ) : null}

      <section className="panel admin-invitations-panel">
        {loading ? (
          <div className="today-loading">
            <Loader2 className="spin" size={18} aria-hidden="true" />
            Loading invitation requests...
          </div>
        ) : invitations.length === 0 ? (
          <div className="empty-state">
            <strong>No invitation requests yet.</strong>
            <span>New requests will appear here when businesses submit the form.</span>
          </div>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Requester</th>
                  <th>Business</th>
                  <th>Plan</th>
                  <th>Platforms</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td>
                      <strong>{invitation.fullName}</strong>
                      <span>{invitation.workEmail}</span>
                    </td>
                    <td>
                      <strong>{invitation.businessName}</strong>
                      <span>{invitation.websiteUrl ?? "Website not supplied"}</span>
                    </td>
                    <td>{formatPlan(invitation.preferredPlan)}</td>
                    <td>{invitation.platforms.map(formatPlatform).join(", ")}</td>
                    <td>{formatDate(invitation.createdAt)}</td>
                    <td>
                      <span className={`status-pill ${invitation.status.toLowerCase()}`}>
                        {formatStatus(invitation.status)}
                      </span>
                    </td>
                    <td>
                      <div className="admin-action-row">
                        <Link className="secondary-button" href={`/admin/invitations/${invitation.id}`}>
                          <Eye size={15} aria-hidden="true" />
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatPlan(value: string): string {
  if (value === "STARTER") {
    return "Starter";
  }

  if (value === "PROFESSIONAL") {
    return "Business";
  }

  if (value === "BUSINESS") {
    return "Enterprise";
  }

  return value;
}

function formatPlatform(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatus(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
