import { permanentRedirect } from "next/navigation";

export default async function Page() {
  permanentRedirect("/community?filter=career");
}
