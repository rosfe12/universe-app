"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Link2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { ActionFeedbackBanner } from "@/components/shared/action-feedback-banner";
import { ShareActionGroup } from "@/components/shared/share-action-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { rememberReferralCode } from "@/lib/referral-code";
import { getCurrentSupabaseAuthUser } from "@/lib/supabase/client";
import { buildInviteCode, createInviteSharePayload } from "@/lib/share-utils";

export function InvitePage() {
  const searchParams = useSearchParams();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [inviteUserId, setInviteUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;

    void (async () => {
      const authUser = await getCurrentSupabaseAuthUser();
      if (!active) {
        return;
      }

      setInviteUserId(authUser?.id);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const inviteCodeFromQuery = searchParams.get("code");
    if (inviteCodeFromQuery) {
      rememberReferralCode(inviteCodeFromQuery);
    }
  }, [searchParams]);

  const inviteCode = useMemo(() => {
    return searchParams.get("code") || buildInviteCode(inviteUserId);
  }, [inviteUserId, searchParams]);

  const sharePayload = useMemo(() => createInviteSharePayload(inviteCode), [inviteCode]);

  return (
    <AppShell title="친구 초대" showTabs={false} showTopNavActions={false}>
      {feedback ? <ActionFeedbackBanner message={feedback} onClose={() => setFeedback(null)} /> : null}
      <Card className="overflow-hidden border-white/10 bg-white/[0.04]">
        <CardContent className="space-y-5 py-6">
          <div className="space-y-2">
            <div className="inline-flex rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-200">
              CAMVERSE 초대
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
              대학생만 들어올 수 있는 커뮤니티인데 같이 써보자
            </h2>
            <p className="text-sm leading-6 text-slate-300">
              우리학교 글, 전체 핫글, 투표와 댓글이 한 번에 이어지는 익명 커뮤니티를 친구와 같이 시작할 수 있습니다.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/10 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              Invite Code
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-white">{inviteCode}</p>
              <div className="rounded-full bg-white/5 p-3 text-indigo-200">
                <Link2 className="h-5 w-5" />
              </div>
            </div>
          </div>

          <ShareActionGroup payload={sharePayload} onFeedback={setFeedback} large />

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
            친구가 링크를 열면 CAMVERSE 초대 화면으로 바로 들어오고, 앱 설치 없이 웹에서 먼저 둘러볼 수 있습니다.
          </div>

          <Button asChild variant="outline" className="w-full">
            <Link href="/home">
              CAMVERSE로 돌아가기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
