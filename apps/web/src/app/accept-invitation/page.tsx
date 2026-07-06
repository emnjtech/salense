import { AcceptInvitationPage } from "../../components/subscription/accept-invitation-page";

export const metadata = {
  title: "Accept Invitation | Salense",
};

interface PageProps {
  readonly searchParams?: Promise<{
    readonly token?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  return <AcceptInvitationPage token={resolvedSearchParams?.token} />;
}
