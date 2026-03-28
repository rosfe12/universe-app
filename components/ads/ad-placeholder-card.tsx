import Link from "next/link";
import { ArrowRight, Megaphone, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdPlacement } from "@/lib/ads";

const AD_COPY: Record<
  AdPlacement,
  {
    eyebrow: string;
    title: string;
    description: string;
    ctaLabel: string;
    href: string;
  }
> = {
  feedInline: {
    eyebrow: "CAMVERSE 앱 홍보",
    title: "학교별 커뮤니티, 수강교환, 프로필을 한 곳에서",
    description: "지금 보고 있는 CAMVERSE에서 대학생 커뮤니티와 학교 기능을 더 편하게 이어가보세요.",
    ctaLabel: "CAMVERSE 보기",
    href: "/home",
  },
  hotGalleryFooter: {
    eyebrow: "CAMVERSE 앱 홍보",
    title: "지금 뜨는 글부터 익명 커뮤니티까지 CAMVERSE에서 확인",
    description: "핫한 글, 우리학교 이야기, 알림과 메시지까지 앱처럼 빠르게 이어집니다.",
    ctaLabel: "커뮤니티로 이동",
    href: "/community",
  },
  lectureDetailFooter: {
    eyebrow: "CAMVERSE 앱 홍보",
    title: "강의평, 수강신청 매칭, 학교 정보까지 함께 쓰세요",
    description: "강의 상세를 보다가 바로 교환 글과 우리학교 정보까지 이어서 확인할 수 있습니다.",
    ctaLabel: "수강교환 보기",
    href: "/trade",
  },
};

export function AdPlaceholderCard({
  placement,
  className,
}: {
  placement: AdPlacement;
  className?: string;
}) {
  const copy = AD_COPY[placement];

  return (
    <Card
      className={cn(
        "overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(15,23,42,0.98))] shadow-none",
        className,
      )}
    >
      <CardContent className="space-y-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-full bg-indigo-500/12 p-2 text-indigo-200">
              <Megaphone className="h-4 w-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-200">
                <Sparkles className="h-3 w-3" />
                {copy.eyebrow}
              </div>
              <p className="font-semibold leading-6 text-white">{copy.title}</p>
              <p className="text-sm leading-6 text-slate-300">{copy.description}</p>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 border-white/15 text-slate-300">
            AD
          </Badge>
        </div>
        <Button asChild size="sm" variant="outline" className="w-full border-white/12 bg-white/[0.03] text-white hover:bg-white/[0.06]">
          <Link href={copy.href}>
            {copy.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
