"use client";

import {
  Archive,
  CheckCircle2,
  Eye,
  Loader2,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  createSubscriptionApiClient,
  type AdminInvitation,
  type AdminInvitationFilters,
} from "../../lib/api/subscription-client";
import { readAdminSession } from "../../lib/admin-session";

type InvitationListMode = "active" | "archived";
type InvitationAction =
  | "approve"
  | "archive"
  | "delete"
  | "reject"
  | "restore";

interface AdminInvitationsWorkspaceProps {
  readonly mode?: InvitationListMode;
}

interface FilterState {
  readonly archivedFrom: string;
  readonly archivedTo: string;
  readonly platform: string;
  readonly preferredPlan: string;
  readonly search: string;
  readonly status: string;
  readonly submittedFrom: string;
  readonly submittedTo: string;
}

const emptyFilters: FilterState = {
  archivedFrom: "",
  archivedTo: "",
  platform: "",
  preferredPlan: "",
  search: "",
  status: "",
  submittedFrom: "",
  submittedTo: "",
};

export function AdminInvitationsWorkspace({
  mode = "active",
}: AdminInvitationsWorkspaceProps) {
  const router = useRouter();
  const client = useMemo(() => createSubscriptionApiClient(), []);
  const [invitations, setInvitations] = useState<readonly AdminInvitation[]>([]);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<{
    readonly invitationId: string;
    readonly type: InvitationAction;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminInvitation | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const apiFilters = useMemo(
    () => toApiFilters(filters, mode),
    [filters, mode],
  );

  useEffect(() => {
    let mounted = true;

    async function loadInvitations() {
      if (!readAdminSession()) {
        router.replace(`/admin/login?next=${mode === "archived" ? "/admin/invitations/archived" : "/admin"}`);
        return;
      }

      setLoading(true);

      try {
        const response = await client.listInvitations(apiFilters);

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
  }, [apiFilters, client, mode, router]);

  async function runInvitationAction(
    type: InvitationAction,
    invitation: AdminInvitation,
    callback: () => Promise<string>,
  ) {
    setAction({ invitationId: invitation.id, type });
    setError(null);
    setSuccess(null);

    try {
      const message = await callback();
      setInvitations((current) =>
        current.filter((currentInvitation) => currentInvitation.id !== invitation.id),
      );
      setSuccess(message);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Invitation request could not be updated. Please try again.",
      );
    } finally {
      setAction(null);
    }
  }

  async function approveInvitation(invitation: AdminInvitation) {
    await runInvitationAction("approve", invitation, async () => {
      await client.approveInvitation(invitation.id);

      return "Invitation request approved and invitation email sent.";
    });
  }

  async function rejectInvitation(invitation: AdminInvitation) {
    await runInvitationAction("reject", invitation, async () => {
      await client.rejectInvitation(invitation.id);

      return "Invitation request rejected.";
    });
  }

  async function archiveInvitation(invitation: AdminInvitation) {
    await runInvitationAction("archive", invitation, async () => {
      const response = await client.archiveInvitation(invitation.id);

      return response.message;
    });
  }

  async function restoreInvitation(invitation: AdminInvitation) {
    await runInvitationAction("restore", invitation, async () => {
      const response = await client.restoreInvitation(invitation.id);

      return response.message;
    });
  }

  async function permanentlyDeleteInvitation(invitation: AdminInvitation) {
    await runInvitationAction("delete", invitation, async () => {
      const response = await client.permanentlyDeleteInvitation(
        invitation.id,
        deleteConfirmation,
      );

      setDeleteTarget(null);
      setDeleteConfirmation("");

      return response.message;
    });
  }

  return (
    <main className="workspace admin-invitations-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Private access</p>
          <h1>{mode === "archived" ? "Archived Invitation Requests" : "Invitation requests"}</h1>
          <p>
            {mode === "archived"
              ? "Review archived invitation requests, restore them when needed, or remove eligible requests with explicit confirmation."
              : "Review selected businesses, approve access, and manage private account creation requests for Salense."}
          </p>
        </div>
        <div className="admin-header-actions">
          <Link className="secondary-button" href="/admin/settings">
            Admin settings
          </Link>
        </div>
      </header>

      <nav className="admin-request-tabs" aria-label="Invitation request views">
        <Link className={mode === "active" ? "active" : ""} href="/admin">
          Active Requests
        </Link>
        <Link
          className={mode === "archived" ? "active" : ""}
          href="/admin/invitations/archived"
        >
          Archived Requests
        </Link>
      </nav>

      {success ? (
        <section className="state-banner success" role="status">
          {success}
        </section>
      ) : null}

      {error ? (
        <section className="state-banner error" role="alert">
          {error}
        </section>
      ) : null}

      <section className="panel admin-invitations-panel">
        <InvitationFilters filters={filters} mode={mode} onChange={setFilters} />

        {loading ? (
          <div className="today-loading">
            <Loader2 className="spin" size={18} aria-hidden="true" />
            Loading invitation requests...
          </div>
        ) : invitations.length === 0 ? (
          <div className="empty-state">
            <strong>
              {mode === "archived"
                ? "No archived invitation requests."
                : "No active invitation requests."}
            </strong>
            <span>
              {mode === "archived"
                ? "Archived requests will appear here when removed from the active list."
                : "New requests will appear here when businesses submit the form."}
            </span>
          </div>
        ) : (
          <InvitationTable
            action={action}
            invitations={invitations}
            mode={mode}
            onArchive={archiveInvitation}
            onApprove={approveInvitation}
            onDelete={setDeleteTarget}
            onReject={rejectInvitation}
            onRestore={restoreInvitation}
          />
        )}
      </section>

      {deleteTarget ? (
        <DeleteInvitationDialog
          action={action}
          confirmation={deleteConfirmation}
          invitation={deleteTarget}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteConfirmation("");
          }}
          onChange={setDeleteConfirmation}
          onConfirm={() => void permanentlyDeleteInvitation(deleteTarget)}
        />
      ) : null}
    </main>
  );
}

function InvitationFilters({
  filters,
  mode,
  onChange,
}: {
  readonly filters: FilterState;
  readonly mode: InvitationListMode;
  readonly onChange: (filters: FilterState) => void;
}) {
  function updateFilter(key: keyof FilterState, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="admin-invitation-filters" aria-label="Invitation filters">
      <input
        aria-label="Search invitation requests"
        onChange={(event) => updateFilter("search", event.target.value)}
        placeholder="Search applicant, business or email"
        value={filters.search}
      />
      <select
        aria-label="Filter by status"
        onChange={(event) => updateFilter("status", event.target.value)}
        value={filters.status}
      >
        <option value="">All statuses</option>
        {statusOptions(mode).map((status) => (
          <option key={status} value={status}>
            {formatStatus(status)}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by plan"
        onChange={(event) => updateFilter("preferredPlan", event.target.value)}
        value={filters.preferredPlan}
      >
        <option value="">All plans</option>
        <option value="STARTER">Starter</option>
        <option value="PROFESSIONAL">Business</option>
        <option value="BUSINESS">Enterprise</option>
      </select>
      <select
        aria-label="Filter by platform"
        onChange={(event) => updateFilter("platform", event.target.value)}
        value={filters.platform}
      >
        <option value="">All platforms</option>
        <option value="SHOPIFY">Shopify</option>
        <option value="WOOCOMMERCE">WooCommerce</option>
        <option value="AMAZON_SELLER">Amazon Seller</option>
        <option value="TIKTOK_SHOP">TikTok Shop</option>
      </select>
      <input
        aria-label="Submitted from"
        onChange={(event) => updateFilter("submittedFrom", event.target.value)}
        type="date"
        value={filters.submittedFrom}
      />
      <input
        aria-label="Submitted to"
        onChange={(event) => updateFilter("submittedTo", event.target.value)}
        type="date"
        value={filters.submittedTo}
      />
      {mode === "archived" ? (
        <>
          <input
            aria-label="Archived from"
            onChange={(event) => updateFilter("archivedFrom", event.target.value)}
            type="date"
            value={filters.archivedFrom}
          />
          <input
            aria-label="Archived to"
            onChange={(event) => updateFilter("archivedTo", event.target.value)}
            type="date"
            value={filters.archivedTo}
          />
        </>
      ) : null}
    </div>
  );
}

function InvitationTable({
  action,
  invitations,
  mode,
  onApprove,
  onArchive,
  onDelete,
  onReject,
  onRestore,
}: {
  readonly action: {
    readonly invitationId: string;
    readonly type: InvitationAction;
  } | null;
  readonly invitations: readonly AdminInvitation[];
  readonly mode: InvitationListMode;
  readonly onApprove: (invitation: AdminInvitation) => void;
  readonly onArchive: (invitation: AdminInvitation) => void;
  readonly onDelete: (invitation: AdminInvitation) => void;
  readonly onReject: (invitation: AdminInvitation) => void;
  readonly onRestore: (invitation: AdminInvitation) => void;
}) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Requester</th>
            <th>Business</th>
            <th>Plan</th>
            <th>Platforms</th>
            <th>Submitted</th>
            {mode === "archived" ? <th>Archived</th> : null}
            {mode === "archived" ? <th>Archived by</th> : null}
            <th>Status</th>
            {mode === "archived" ? <th>Previous status</th> : null}
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
              {mode === "archived" ? (
                <td>{invitation.archivedAt ? formatDate(invitation.archivedAt) : "Not captured"}</td>
              ) : null}
              {mode === "archived" ? (
                <td>{invitation.archivedByUserId ?? "Not captured"}</td>
              ) : null}
              <td>
                <span className={`status-pill ${invitation.status.toLowerCase()}`}>
                  {formatStatus(invitation.status)}
                </span>
              </td>
              {mode === "archived" ? (
                <td>{formatStatus(invitation.statusBeforeArchive ?? "PENDING")}</td>
              ) : null}
              <td>
                <div className="admin-action-row">
                  <Link className="secondary-button" href={`/admin/invitations/${invitation.id}`}>
                    <Eye size={15} aria-hidden="true" />
                    View
                  </Link>
                  {mode === "active" ? (
                    <>
                      <ActionButton
                        action={action}
                        invitation={invitation}
                        label="Approve"
                        onClick={onApprove}
                        type="approve"
                        disabled={!canApprove(invitation)}
                        icon={<CheckCircle2 size={15} aria-hidden="true" />}
                      />
                      <ActionButton
                        action={action}
                        invitation={invitation}
                        label="Reject"
                        onClick={onReject}
                        type="reject"
                        disabled={!canReject(invitation)}
                        icon={<XCircle size={15} aria-hidden="true" />}
                      />
                      <ActionButton
                        action={action}
                        invitation={invitation}
                        label="Archive"
                        onClick={onArchive}
                        type="archive"
                        icon={<Archive size={15} aria-hidden="true" />}
                      />
                    </>
                  ) : (
                    <ActionButton
                      action={action}
                      invitation={invitation}
                      label="Restore"
                      onClick={onRestore}
                      type="restore"
                      icon={<RotateCcw size={15} aria-hidden="true" />}
                    />
                  )}
                  <button
                    className="danger-button"
                    disabled={Boolean(action) || invitation.linkedActiveAccount}
                    onClick={() => onDelete(invitation)}
                    title={
                      invitation.linkedActiveAccount
                        ? "This invitation request is linked to an active account and cannot be permanently deleted."
                        : "Delete permanently"
                    }
                    type="button"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Delete Permanently
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionButton({
  action,
  disabled = false,
  icon,
  invitation,
  label,
  onClick,
  type,
}: {
  readonly action: {
    readonly invitationId: string;
    readonly type: InvitationAction;
  } | null;
  readonly disabled?: boolean;
  readonly icon: ReactNode;
  readonly invitation: AdminInvitation;
  readonly label: string;
  readonly onClick: (invitation: AdminInvitation) => void;
  readonly type: InvitationAction;
}) {
  const busy = action?.invitationId === invitation.id && action.type === type;

  return (
    <button
      className="secondary-button"
      disabled={disabled || Boolean(action)}
      onClick={() => onClick(invitation)}
      type="button"
    >
      {busy ? <Loader2 className="spin" size={15} aria-hidden="true" /> : icon}
      {label}
    </button>
  );
}

function DeleteInvitationDialog({
  action,
  confirmation,
  invitation,
  onCancel,
  onChange,
  onConfirm,
}: {
  readonly action: {
    readonly invitationId: string;
    readonly type: InvitationAction;
  } | null;
  readonly confirmation: string;
  readonly invitation: AdminInvitation;
  readonly onCancel: () => void;
  readonly onChange: (value: string) => void;
  readonly onConfirm: () => void;
}) {
  const deleting = action?.invitationId === invitation.id && action.type === "delete";

  return (
    <div className="confirmation-backdrop" role="presentation">
      <section
        aria-labelledby="delete-invitation-title"
        aria-modal="true"
        className="confirmation-dialog"
        role="dialog"
      >
        <h2 id="delete-invitation-title">Permanently delete invitation request?</h2>
        <p>
          This action will permanently remove the invitation request and cannot be undone.
          Consider archiving the request instead if it may be needed for audit or reporting
          purposes.
        </p>
        <label>
          Type DELETE to confirm
          <input
            autoFocus
            onChange={(event) => onChange(event.target.value)}
            value={confirmation}
          />
        </label>
        <div className="admin-detail-actions">
          <button className="secondary-button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="danger-button"
            disabled={confirmation !== "DELETE" || deleting}
            onClick={onConfirm}
            type="button"
          >
            {deleting ? <Loader2 className="spin" size={15} aria-hidden="true" /> : null}
            Delete Permanently
          </button>
        </div>
      </section>
    </div>
  );
}

function toApiFilters(filters: FilterState, mode: InvitationListMode): AdminInvitationFilters {
  return {
    view: mode,
    ...(filters.archivedFrom ? { archivedFrom: filters.archivedFrom } : {}),
    ...(filters.archivedTo ? { archivedTo: filters.archivedTo } : {}),
    ...(filters.platform ? { platform: filters.platform } : {}),
    ...(filters.preferredPlan ? { preferredPlan: filters.preferredPlan } : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.submittedFrom ? { submittedFrom: filters.submittedFrom } : {}),
    ...(filters.submittedTo ? { submittedTo: filters.submittedTo } : {}),
  };
}

function canApprove(invitation: AdminInvitation): boolean {
  return invitation.status === "PENDING" || invitation.status === "APPROVED";
}

function canReject(invitation: AdminInvitation): boolean {
  return invitation.status === "PENDING" || invitation.status === "APPROVED";
}

function statusOptions(mode: InvitationListMode): readonly string[] {
  return mode === "archived"
    ? ["ARCHIVED"]
    : ["PENDING", "APPROVED", "REJECTED", "INVITATION_SENT", "INVITATION_ACCEPTED"];
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
