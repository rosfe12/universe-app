import { Megaphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdPlacement } from "@/lib/ads";

const AD_COPY: Record<
  AdPlacement,
  {
    title: string;
    description: string;
  }
> = {
  feedInline: {
    title: "광고 슬롯 준비 중",
    description: "이 위치에 제휴 광고가 표시됩니다.",
  },
  hotGalleryFooter: {
    title: "핫갤 하단 제휴 슬롯",
    description: "핫갤 하단에 제휴 광고가 표시됩니다.",
  },
  lectureDetailFooter: {
    title: "강의 상세 하단 제휴 슬롯",
    description: "강의 상세 하단에 제휴 광고가 표시됩니다.",
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
        "overflow-hidden border-dashed border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.96))] shadow-none",
        className,
      )}
    >
      <CardContent className="space-y-3 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-slate-900/5 p-2 text-slate-600">
              <Megaphone className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{copy.title}</p>
              <p className="text-sm text-muted-foreground">{copy.description}</p>
            </div>
          </div>
          <Badge variant="outline">AD</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
