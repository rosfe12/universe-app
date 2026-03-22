import { permanentRedirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/school?tab=admission&post=${id}`);
}
