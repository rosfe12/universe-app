import { CommunityPage } from "@/features/community/community-page";
import { getCommunityPageSnapshot } from "@/features/posts/api/server";

export const preferredRegion = "hnd1";

export default async function Page() {
  const initialSnapshot = await getCommunityPageSnapshot();

  return <CommunityPage initialSnapshot={initialSnapshot} />;
}
