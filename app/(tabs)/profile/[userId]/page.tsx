import { getChromePageSnapshot } from "@/features/posts/api/server";
import { UserProfilePage } from "@/features/profile/user-profile-page";
import { getUserProfile } from "@/app/actions/profile-actions";

export const preferredRegion = "hnd1";

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const [initialSnapshot, initialProfileResult] = await Promise.all([
    getChromePageSnapshot(),
    getUserProfile(userId).catch(() => null),
  ]);

  return (
    <UserProfilePage
      userId={userId}
      initialSnapshot={initialSnapshot}
      initialProfile={initialProfileResult?.ok ? initialProfileResult.profile : undefined}
      initialProfileError={initialProfileResult && !initialProfileResult.ok ? initialProfileResult.error : undefined}
    />
  );
}
