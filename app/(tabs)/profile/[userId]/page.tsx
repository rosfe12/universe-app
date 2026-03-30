import { UserProfilePage } from "@/features/profile/user-profile-page";

export const preferredRegion = "hnd1";

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return <UserProfilePage userId={userId} />;
}
