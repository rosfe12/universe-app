import { AdmissionDetailPage } from "@/features/admission/admission-detail-page";
import { getAdmissionDetailSnapshot } from "@/features/posts/api/server";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialSnapshot = await getAdmissionDetailSnapshot();

  return <AdmissionDetailPage questionId={id} initialSnapshot={initialSnapshot} />;
}
