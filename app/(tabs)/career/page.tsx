import { CareerPage } from "@/features/career/career-page";
import { getCareerPageSnapshot } from "@/features/posts/api/server";

export default async function Page() {
  const initialSnapshot = await getCareerPageSnapshot();

  return <CareerPage initialSnapshot={initialSnapshot} />;
}
