import { AdminInvitationDetailWorkspace } from "../../../../components/subscription/admin-invitation-detail-workspace";

interface AdminInvitationDetailPageProps {
  readonly params: Promise<{ readonly invitationId: string }>;
}

export default async function AdminInvitationDetailPage({
  params,
}: AdminInvitationDetailPageProps) {
  const resolvedParams = await params;

  return <AdminInvitationDetailWorkspace invitationId={resolvedParams.invitationId} />;
}
