import { HomePage } from "@/features/home/home-page";
import { getHomePageSnapshot } from "@/features/posts/api/server";

export const preferredRegion = "hnd1";

export default async function IndexPage() {
  const initialSnapshot = await getHomePageSnapshot();

  return <HomePage initialSnapshot={initialSnapshot} />;
}
