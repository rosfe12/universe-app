"use client";

import Link from "next/link";
import { LockKeyhole, UserRoundPlus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAuthFlowHref, hasCompletedOnboarding } from "@/lib/supabase/app-data";
import type { User } from "@/types";

export function AccountRequiredCard({
  isAuthenticated,
  user,
  nextPath,
  title,
  description,
  ctaLabel,
}: {
  isAuthenticated: boolean;
  user?: Pick<User, "schoolId"> | null;
  nextPath: string;
  title: string;
  description: string;
  ctaLabel?: string;
}) {
  const needsOnboarding = isAuthenticated && !hasCompletedOnboarding(user);
  const href = getAuthFlowHref({ isAuthenticated, user, nextPath });
  const Icon = needsOnboarding ? UserRoundPlus : LockKeyhole;

  return (
    <Card className="border-dashed border-white/80 bg-white/92">
      <CardContent className="flex flex-col items-center gap-3 py-7 text-center">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="max-w-[240px] text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <Button asChild>
          <Link href={href}>{ctaLabel ?? (needsOnboarding ? "프로필 설정 이어가기" : "로그인하기")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
