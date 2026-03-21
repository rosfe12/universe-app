import { AdminPage } from "@/features/admin/admin-page";
import { getAdminPageSnapshot } from "@/features/posts/api/server";

export default async function Page() {
  const initialSnapshot = await getAdminPageSnapshot();

  return <AdminPage initialSnapshot={initialSnapshot} />;
}
