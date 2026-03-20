import { LecturesPage } from "@/features/lectures/lectures-page";
import { getLecturesPageSnapshot } from "@/features/lectures/api/server";

export default async function Page() {
  const initialSnapshot = await getLecturesPageSnapshot();

  return <LecturesPage initialSnapshot={initialSnapshot} />;
}
