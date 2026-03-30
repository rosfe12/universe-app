import { MessagesPage } from "@/features/messages/messages-page";
import { getMessagesPageSnapshot } from "@/features/posts/api/server";

export default async function MessagesRoute() {
  const initialSnapshot = await getMessagesPageSnapshot();

  return <MessagesPage initialSnapshot={initialSnapshot} />;
}
