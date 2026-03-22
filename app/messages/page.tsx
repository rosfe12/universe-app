import { MessagesPage } from "@/features/messages/messages-page";
import { loadServerRuntimeSnapshot } from "@/lib/supabase/server-data";

export default async function MessagesRoute() {
  const snapshot = await loadServerRuntimeSnapshot("messages");

  return <MessagesPage initialSnapshot={snapshot} />;
}
