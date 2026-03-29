import { getChromePageSnapshot } from "@/features/posts/api/server";
import { OnboardingPage } from "@/features/profile/onboarding-page";

export default async function Page() {
  const initialSnapshot = await getChromePageSnapshot();

  return <OnboardingPage initialSnapshot={initialSnapshot} />;
}
