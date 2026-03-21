import type { Metadata } from "next";

import "@/app/globals.css";
import { resolveAppUrl } from "@/lib/env";

const appUrl = resolveAppUrl();

export const metadata: Metadata = {
  title: "유니버스",
  description: "캠퍼스 라이프 플랫폼",
  metadataBase: new URL(appUrl),
  icons: {
    icon: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
