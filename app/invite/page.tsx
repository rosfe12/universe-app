import type { Metadata } from "next";

import { InvitePage } from "@/features/invite/invite-page";

export const metadata: Metadata = {
  title: "CAMVERSE 초대",
  description: "대학생만 들어올 수 있는 커뮤니티, 같이 들어와봐",
  openGraph: {
    title: "CAMVERSE 초대",
    description: "대학생만 들어올 수 있는 커뮤니티, 같이 들어와봐",
    images: ["/icons/icon-512.png"],
  },
};

export default function Page() {
  return <InvitePage />;
}
