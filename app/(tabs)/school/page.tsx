import { SchoolPage } from "@/features/school/school-page";
import { getSchoolPageSnapshot } from "@/features/trade/api/server";

export default async function Page() {
  const initialSnapshot = await getSchoolPageSnapshot();

  return <SchoolPage initialSnapshot={initialSnapshot} />;
}
