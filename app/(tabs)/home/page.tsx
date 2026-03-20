import { HomePage } from "@/features/home/home-page";
import { getHomePageSnapshot } from "@/features/posts/api/server";

export default async function Page() {
  const initialSnapshot = await getHomePageSnapshot();

  return <HomePage initialSnapshot={initialSnapshot} />;
}
