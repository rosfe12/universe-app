import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "유니버스",
  description: "캠퍼스 라이프 플랫폼",
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
