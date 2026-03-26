import Link from "next/link";

import { getSupportUrl } from "@/lib/env";

export function AppFooterLinks() {
  const supportUrl = getSupportUrl();

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
      <Link href="/terms" className="transition-colors hover:text-foreground">
        이용약관
      </Link>
      <Link href="/privacy" className="transition-colors hover:text-foreground">
        개인정보처리방침
      </Link>
      <Link href={supportUrl} className="transition-colors hover:text-foreground">
        문의하기
      </Link>
    </div>
  );
}
