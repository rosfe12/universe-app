import { permanentRedirect } from "next/navigation";

export default async function Page() {
  permanentRedirect("/school?tab=admission");
}
