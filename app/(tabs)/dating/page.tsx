import { DatingPage } from "@/features/dating/dating-page";
import { getDatingPageSnapshot } from "@/features/posts/api/server";

export default async function Page() {
  const initialSnapshot = await getDatingPageSnapshot();

  return <DatingPage initialSnapshot={initialSnapshot} />;
}
