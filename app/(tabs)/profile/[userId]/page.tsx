import { UserProfilePage } from "@/features/profile/user-profile-page";
import { getProfilePageSnapshot } from "@/features/posts/api/server";

export const preferredRegion = "hnd1";

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const initialSnapshot = await getProfilePageSnapshot();

  return <UserProfilePage userId={userId} initialSnapshot={initialSnapshot} />;
}
