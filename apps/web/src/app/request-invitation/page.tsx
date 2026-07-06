import { RequestInvitationPage } from "../../components/subscription/request-invitation-page";

export const metadata = {
  title: "Request Invitation | Salense",
};

interface PageProps {
  readonly searchParams?: Promise<{
    readonly plan?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  return <RequestInvitationPage initialPlan={resolvedSearchParams?.plan} />;
}
