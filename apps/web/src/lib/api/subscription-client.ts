import { getDefaultApiBaseUrl } from "./store-integrations-client";
import type {
  SubscriptionPlan,
  SubscriptionPlatform,
} from "../../components/subscription/subscription-plans";
import { fetchWithAdminSessionRefresh } from "../admin-session";

export interface SubscriptionInvitationInput {
  readonly businessName: string;
  readonly fullName: string;
  readonly message?: string;
  readonly phoneNumber?: string;
  readonly platforms: readonly SubscriptionPlatform[];
  readonly preferredPlan: SubscriptionPlan;
  readonly websiteUrl?: string;
  readonly workEmail: string;
}

export interface SubscriptionInvitationResponse {
  readonly invitationId: string;
  readonly invitationRequested: true;
  readonly preferredPlan: SubscriptionPlan;
}

export interface AdminInvitation {
  readonly id: string;
  readonly businessName: string;
  readonly fullName: string;
  readonly workEmail: string;
  readonly phoneNumber: string | null;
  readonly websiteUrl: string | null;
  readonly preferredPlan: string;
  readonly platforms: readonly string[];
  readonly message: string | null;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly approvedAt: string | null;
  readonly rejectedAt: string | null;
  readonly archivedAt: string | null;
  readonly invitationTokenExpiresAt: string | null;
  readonly invitationTokenUsedAt: string | null;
}

export interface InvitationContext {
  readonly valid: true;
  readonly businessName: string;
  readonly fullName: string;
  readonly workEmail: string;
  readonly preferredPlan: string;
}

export interface SubscriptionApiClient {
  requestInvitation(input: SubscriptionInvitationInput): Promise<SubscriptionInvitationResponse>;
  listInvitations(accessToken?: string): Promise<{ readonly invitations: readonly AdminInvitation[] }>;
  approveInvitation(
    invitationId: string,
    accessToken?: string,
  ): Promise<{ readonly invitation: AdminInvitation; readonly invitationLink: string }>;
  archiveInvitation(
    invitationId: string,
    accessToken?: string,
  ): Promise<{ readonly invitation: AdminInvitation }>;
  rejectInvitation(
    invitationId: string,
    accessToken?: string,
  ): Promise<{ readonly invitation: AdminInvitation }>;
  getInvitationContext(token: string): Promise<InvitationContext>;
  acceptInvitation(input: {
    readonly token: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly password: string;
    readonly confirmPassword: string;
  }): Promise<{
    readonly accountCreated: true;
    readonly businessName: string;
    readonly email: string;
  }>;
}

export class SubscriptionClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SubscriptionClientError";
    this.status = status;
  }
}

interface SubscriptionApiClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export function createSubscriptionApiClient(
  options: SubscriptionApiClientOptions = {},
): SubscriptionApiClient {
  const baseUrl = trimTrailingSlash(options.baseUrl ?? getDefaultApiBaseUrl());
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async acceptInvitation(input) {
      const response = await fetchImpl(`${baseUrl}/subscription/invitations/accept`, {
        body: JSON.stringify(input),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new SubscriptionClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as {
        readonly accountCreated: true;
        readonly businessName: string;
        readonly email: string;
      };
    },
    async approveInvitation(invitationId, accessToken) {
      const response = await fetchWithAdminSessionRefresh(
        `${baseUrl}/subscription/invitations/${encodeURIComponent(invitationId)}/approve`,
        { method: "POST" },
        { accessToken, baseUrl, fetchImpl },
      );

      if (!response.ok) {
        throw new SubscriptionClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as {
        readonly invitation: AdminInvitation;
        readonly invitationLink: string;
      };
    },
    async archiveInvitation(invitationId, accessToken) {
      const response = await fetchWithAdminSessionRefresh(
        `${baseUrl}/subscription/invitations/${encodeURIComponent(invitationId)}/archive`,
        { method: "POST" },
        { accessToken, baseUrl, fetchImpl },
      );

      if (!response.ok) {
        throw new SubscriptionClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as { readonly invitation: AdminInvitation };
    },
    async getInvitationContext(token) {
      const response = await fetchImpl(
        `${baseUrl}/subscription/invitations/accept?token=${encodeURIComponent(token)}`,
      );

      if (!response.ok) {
        throw new SubscriptionClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as InvitationContext;
    },
    async listInvitations(accessToken) {
      const response = await fetchWithAdminSessionRefresh(
        `${baseUrl}/subscription/invitations/admin`,
        undefined,
        { accessToken, baseUrl, fetchImpl },
      );

      if (!response.ok) {
        throw new SubscriptionClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as {
        readonly invitations: readonly AdminInvitation[];
      };
    },
    async requestInvitation(input) {
      const response = await fetchImpl(`${baseUrl}/subscription/invitations`, {
        body: JSON.stringify(input),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new SubscriptionClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as SubscriptionInvitationResponse;
    },
    async rejectInvitation(invitationId, accessToken) {
      const response = await fetchWithAdminSessionRefresh(
        `${baseUrl}/subscription/invitations/${encodeURIComponent(invitationId)}/reject`,
        { method: "POST" },
        { accessToken, baseUrl, fetchImpl },
      );

      if (!response.ok) {
        throw new SubscriptionClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as { readonly invitation: AdminInvitation };
    },
  };
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { readonly message?: unknown };

    if (typeof body.message === "string") {
      return body.message;
    }

    if (Array.isArray(body.message)) {
      return body.message.filter((message) => typeof message === "string").join(" ");
    }
  } catch {
    return "We could not send your invitation request. Please check the details and try again.";
  }

  return "We could not send your invitation request. Please check the details and try again.";
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}
