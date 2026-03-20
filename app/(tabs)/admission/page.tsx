import { AdmissionPage } from "@/features/admission/admission-page";
import { getAdmissionPageSnapshot } from "@/features/posts/api/server";

export default async function Page() {
  const initialSnapshot = await getAdmissionPageSnapshot();

  return <AdmissionPage initialSnapshot={initialSnapshot} />;
}
