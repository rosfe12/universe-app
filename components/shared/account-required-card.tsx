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
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild>
          <Link href={href}>{ctaLabel ?? (needsOnboarding ? "프로필 설정 이어가기" : "로그인하기")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
