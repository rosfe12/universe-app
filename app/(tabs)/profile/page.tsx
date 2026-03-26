import { ProfilePage } from "@/features/profile/profile-page";
import { getProfilePageSnapshot } from "@/features/posts/api/server";

export const preferredRegion = "hnd1";

export default async function Page() {
  const initialSnapshot = await getProfilePageSnapshot();

  return <ProfilePage initialSnapshot={initialSnapshot} />;
}
