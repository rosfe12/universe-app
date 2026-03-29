import { getChromePageSnapshot } from "@/features/posts/api/server";
import { LoginPage } from "@/features/profile/login-page";

export default async function Page() {
  const initialSnapshot = await getChromePageSnapshot();

  return <LoginPage initialSnapshot={initialSnapshot} />;
}
