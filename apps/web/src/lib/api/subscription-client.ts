import { getDefaultApiBaseUrl } from "./store-integrations-client";
import type {
  SubscriptionPlan,
  SubscriptionPlatform,
} from "../../components/subscription/subscription-plans";

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

export interface SubscriptionApiClient {
  requestInvitation(input: SubscriptionInvitationInput): Promise<SubscriptionInvitationResponse>;
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
