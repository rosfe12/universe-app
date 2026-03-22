import { redirect } from "next/navigation";

export default async function Page() {
  redirect("/school?tab=admission");
}
