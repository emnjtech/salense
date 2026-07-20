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
  readonly archivedByUserId: string | null;
  readonly deletedAt: string | null;
  readonly deletedByUserId: string | null;
  readonly invitationTokenExpiresAt: string | null;
  readonly invitationTokenUsedAt: string | null;
  readonly linkedActiveAccount: boolean;
  readonly statusBeforeArchive: string | null;
}

export interface AdminInvitationFilters {
  readonly view?: "active" | "archived";
  readonly status?: string;
  readonly search?: string;
  readonly preferredPlan?: string;
  readonly platform?: string;
  readonly submittedFrom?: string;
  readonly submittedTo?: string;
  readonly archivedFrom?: string;
  readonly archivedTo?: string;
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
  getAdminInvitation(
    invitationId: string,
    accessToken?: string,
  ): Promise<{ readonly invitation: AdminInvitation }>;
  listInvitations(
    filtersOrAccessToken?: AdminInvitationFilters | string,
    accessToken?: string,
  ): Promise<{ readonly invitations: readonly AdminInvitation[] }>;
  approveInvitation(
    invitationId: string,
    accessToken?: string,
  ): Promise<{ readonly invitation: AdminInvitation; readonly invitationLink: string }>;
  archiveInvitation(
    invitationId: string,
    accessToken?: string,
  ): Promise<{ readonly invitation: AdminInvitation; readonly message: string }>;
  restoreInvitation(
    invitationId: string,
    accessToken?: string,
  ): Promise<{ readonly invitation: AdminInvitation; readonly message: string }>;
  permanentlyDeleteInvitation(
    invitationId: string,
    confirmation: string,
    accessToken?: string,
  ): Promise<{ readonly deleted: true; readonly message: string }>;
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

      return (await response.json()) as {
        readonly invitation: AdminInvitation;
        readonly message: string;
      };
    },
    async getAdminInvitation(invitationId, accessToken) {
      const response = await fetchWithAdminSessionRefresh(
        `${baseUrl}/subscription/invitations/admin/${encodeURIComponent(invitationId)}`,
        undefined,
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
    async listInvitations(filtersOrAccessToken, maybeAccessToken) {
      const filters =
        typeof filtersOrAccessToken === "string" ? undefined : filtersOrAccessToken;
      const accessToken =
        typeof filtersOrAccessToken === "string" ? filtersOrAccessToken : maybeAccessToken;
      const response = await fetchWithAdminSessionRefresh(
        `${baseUrl}/subscription/invitations/admin${toQueryString(filters)}`,
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
    async permanentlyDeleteInvitation(invitationId, confirmation, accessToken) {
      const response = await fetchWithAdminSessionRefresh(
        `${baseUrl}/subscription/invitations/${encodeURIComponent(invitationId)}/delete`,
        {
          body: JSON.stringify({ confirmation }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
        { accessToken, baseUrl, fetchImpl },
      );

      if (!response.ok) {
        throw new SubscriptionClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as { readonly deleted: true; readonly message: string };
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
    async restoreInvitation(invitationId, accessToken) {
      const response = await fetchWithAdminSessionRefresh(
        `${baseUrl}/subscription/invitations/${encodeURIComponent(invitationId)}/restore`,
        { method: "POST" },
        { accessToken, baseUrl, fetchImpl },
      );

      if (!response.ok) {
        throw new SubscriptionClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as {
        readonly invitation: AdminInvitation;
        readonly message: string;
      };
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

function toQueryString(filters: AdminInvitationFilters | undefined): string {
  if (!filters) {
    return "";
  }

  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();

  return query ? `?${query}` : "";
}
