import { PlatformDetailWorkspace } from "../../../../components/platforms/platform-detail-workspace";
import type { StorePlatform } from "../../../../lib/api/store-integrations-client";

interface PlatformDetailPageProps {
  readonly params: Promise<{
    readonly platform: string;
  }>;
}

export default async function PlatformDetailPage({ params }: PlatformDetailPageProps) {
  const { platform } = await params;

  return <PlatformDetailWorkspace platform={platform as StorePlatform} />;
}
