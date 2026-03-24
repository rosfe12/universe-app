import { NotificationsPage } from "@/features/notifications/notifications-page";
import { getNotificationsPageSnapshot } from "@/features/trade/api/server";

export const preferredRegion = "hnd1";

export default async function Page() {
  const initialSnapshot = await getNotificationsPageSnapshot();

  return <NotificationsPage initialSnapshot={initialSnapshot} />;
}
