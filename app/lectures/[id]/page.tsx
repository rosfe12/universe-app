import { LectureDetailPage } from "@/features/lectures/lecture-detail-page";
import { getLectureDetailSnapshot } from "@/features/lectures/api/server";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialSnapshot = await getLectureDetailSnapshot();

  return <LectureDetailPage lectureId={id} initialSnapshot={initialSnapshot} />;
}
