"use client";

import { Archive, CheckCircle2, Copy, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createSubscriptionApiClient,
  type AdminInvitation,
} from "../../lib/api/subscription-client";
import { readDemoSession } from "../../lib/auth-session";

export function AdminInvitationsWorkspace() {
  const router = useRouter();
  const client = useMemo(() => createSubscriptionApiClient(), []);
  const [invitations, setInvitations] = useState<readonly AdminInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestLink, setLatestLink] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadInvitations() {
      if (!readDemoSession()) {
        router.replace("/login?next=/admin");
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

  async function approveInvitation(invitationId: string) {
    setActionId(invitationId);
    setError(null);

    try {
      const response = await client.approveInvitation(invitationId);
      setInvitations((current) =>
        current.map((invitation) =>
          invitation.id === invitationId ? response.invitation : invitation,
        ),
      );
      setLatestLink(response.invitationLink);
    } catch {
      setError("Invitation could not be approved. Please try again.");
    } finally {
      setActionId(null);
    }
  }

  async function rejectInvitation(invitationId: string) {
    setActionId(invitationId);
    setError(null);

    try {
      const response = await client.rejectInvitation(invitationId);
      setInvitations((current) =>
        current.map((invitation) =>
          invitation.id === invitationId ? response.invitation : invitation,
        ),
      );
      setLatestLink(null);
    } catch {
      setError("Invitation could not be rejected. Please try again.");
    } finally {
      setActionId(null);
    }
  }

  async function archiveInvitation(invitationId: string) {
    setActionId(invitationId);
    setError(null);

    try {
      const response = await client.archiveInvitation(invitationId);
      setInvitations((current) =>
        current.map((invitation) =>
          invitation.id === invitationId ? response.invitation : invitation,
        ),
      );
      setLatestLink(null);
    } catch {
      setError("Invitation could not be archived. Please try again.");
    } finally {
      setActionId(null);
    }
  }

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
      </header>

      {latestLink ? (
        <section className="state-banner success">
          <Copy size={17} aria-hidden="true" />
          <span>
            Invitation link created: <strong>{latestLink}</strong>
          </span>
        </section>
      ) : null}

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
                        <button
                          className="secondary-button"
                          disabled={!canApproveOrReject(invitation) || actionId === invitation.id}
                          onClick={() => void approveInvitation(invitation.id)}
                          type="button"
                        >
                          {actionId === invitation.id ? (
                            <Loader2 className="spin" size={15} aria-hidden="true" />
                          ) : (
                            <CheckCircle2 size={15} aria-hidden="true" />
                          )}
                          Approve
                        </button>
                        <button
                          className="secondary-button"
                          disabled={!canApproveOrReject(invitation) || actionId === invitation.id}
                          onClick={() => void rejectInvitation(invitation.id)}
                          type="button"
                        >
                          <XCircle size={15} aria-hidden="true" />
                          Reject
                        </button>
                        <button
                          className="secondary-button"
                          disabled={!canArchive(invitation) || actionId === invitation.id}
                          onClick={() => void archiveInvitation(invitation.id)}
                          type="button"
                        >
                          <Archive size={15} aria-hidden="true" />
                          Archive
                        </button>
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

function canApproveOrReject(invitation: AdminInvitation): boolean {
  return invitation.status === "PENDING" || invitation.status === "APPROVED";
}

function canArchive(invitation: AdminInvitation): boolean {
  return (
    invitation.status === "APPROVED" ||
    invitation.status === "REJECTED" ||
    invitation.status === "ACCEPTED"
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
