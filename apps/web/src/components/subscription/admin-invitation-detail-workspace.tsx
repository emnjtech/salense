"use client";

import { Archive, ArrowLeft, CheckCircle2, Copy, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createSubscriptionApiClient,
  type AdminInvitation,
} from "../../lib/api/subscription-client";
import { readAdminSession } from "../../lib/admin-session";

interface AdminInvitationDetailWorkspaceProps {
  readonly invitationId: string;
}

export function AdminInvitationDetailWorkspace({
  invitationId,
}: AdminInvitationDetailWorkspaceProps) {
  const router = useRouter();
  const client = useMemo(() => createSubscriptionApiClient(), []);
  const [invitation, setInvitation] = useState<AdminInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"approve" | "archive" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestLink, setLatestLink] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadInvitation() {
      if (!readAdminSession()) {
        router.replace(`/admin/login?next=/admin/invitations/${invitationId}`);
        return;
      }

      try {
        const response = await client.getAdminInvitation(invitationId);

        if (mounted) {
          setInvitation(response.invitation);
          setError(null);
        }
      } catch {
        if (mounted) {
          setError("Invitation request could not be loaded.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadInvitation();

    return () => {
      mounted = false;
    };
  }, [client, invitationId, router]);

  async function approveInvitation() {
    await runAction("approve", async () => {
      const response = await client.approveInvitation(invitationId);
      setInvitation(response.invitation);
      setLatestLink(response.invitationLink);
    });
  }

  async function rejectInvitation() {
    await runAction("reject", async () => {
      const response = await client.rejectInvitation(invitationId);
      setInvitation(response.invitation);
      setLatestLink(null);
    });
  }

  async function archiveInvitation() {
    await runAction("archive", async () => {
      const response = await client.archiveInvitation(invitationId);
      setInvitation(response.invitation);
      setLatestLink(null);
    });
  }

  async function runAction(
    nextAction: "approve" | "archive" | "reject",
    callback: () => Promise<void>,
  ) {
    setAction(nextAction);
    setError(null);

    try {
      await callback();
    } catch {
      setError("Invitation request could not be updated. Please try again.");
    } finally {
      setAction(null);
    }
  }

  return (
    <main className="workspace admin-invitations-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Invitation review</p>
          <h1>{invitation?.businessName ?? "Invitation request"}</h1>
          <p>Review the applicant before approving private access to Salense.</p>
        </div>
        <Link className="secondary-button" href="/admin">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to requests
        </Link>
      </header>

      {latestLink ? (
        <section className="state-banner success">
          <Copy size={17} aria-hidden="true" />
          <span>
            Invitation email sent. Link: <strong>{latestLink}</strong>
          </span>
        </section>
      ) : null}

      {error ? (
        <section className="state-banner error" role="alert">
          {error}
        </section>
      ) : null}

      {loading ? (
        <section className="today-loading">
          <Loader2 className="spin" size={18} aria-hidden="true" />
          Loading invitation request...
        </section>
      ) : null}

      {!loading && invitation ? (
        <section className="panel admin-invitation-detail-panel">
          <div className="admin-invitation-detail-grid">
            <DetailItem label="Full name" value={invitation.fullName} />
            <DetailItem label="Business name" value={invitation.businessName} />
            <DetailItem label="Email" value={invitation.workEmail} />
            <DetailItem label="Phone" value={invitation.phoneNumber ?? "Not supplied"} />
            <DetailItem label="Website" value={invitation.websiteUrl ?? "Not supplied"} />
            <DetailItem label="Preferred plan" value={formatPlan(invitation.preferredPlan)} />
            <DetailItem
              label="Platforms used"
              value={invitation.platforms.map(formatPlatform).join(", ") || "Not supplied"}
            />
            <DetailItem label="Submission date" value={formatDate(invitation.createdAt)} />
            <DetailItem label="Current status" value={formatStatus(invitation.status)} />
          </div>

          <div className="admin-invitation-message">
            <span>Applicant message</span>
            <p>{invitation.message?.trim() || "No message supplied."}</p>
          </div>

          <div className="admin-detail-actions">
            <button
              className="primary-button"
              disabled={!canApprove(invitation) || action !== null}
              onClick={() => void approveInvitation()}
              type="button"
            >
              {action === "approve" ? (
                <Loader2 className="spin" size={16} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={16} aria-hidden="true" />
              )}
              Approve
            </button>
            <button
              className="secondary-button"
              disabled={!canReject(invitation) || action !== null}
              onClick={() => void rejectInvitation()}
              type="button"
            >
              <XCircle size={16} aria-hidden="true" />
              Reject
            </button>
            <button
              className="secondary-button"
              disabled={!canArchive(invitation) || action !== null}
              onClick={() => void archiveInvitation()}
              type="button"
            >
              <Archive size={16} aria-hidden="true" />
              Archive
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function DetailItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="admin-invitation-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function canApprove(invitation: AdminInvitation): boolean {
  return invitation.status === "PENDING" || invitation.status === "APPROVED";
}

function canReject(invitation: AdminInvitation): boolean {
  return invitation.status === "PENDING" || invitation.status === "APPROVED";
}

function canArchive(invitation: AdminInvitation): boolean {
  return ["ACTIVE", "APPROVED", "INVITATION_SENT", "REJECTED"].includes(
    invitation.status,
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
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
