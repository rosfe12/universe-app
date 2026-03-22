"use client";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import type { AppRuntimeSnapshot } from "@/types";

const SAMPLE_THREADS = [
  {
    id: "msg-1",
    handle: "익명_KU_27",
    preview: "수강신청 교환 글 보고 쪽지 남겨요. 시간표만 맞으면 바로 맞교환 가능해요?",
    time: "방금 전",
    unread: true,
  },
  {
    id: "msg-2",
    handle: "익명_HUFS_42",
    preview: "입시 질문 답변 고마워요. 학교 분위기 관련해서 하나만 더 물어봐도 될까요?",
    time: "12분 전",
    unread: true,
  },
  {
    id: "msg-3",
    handle: "익명_SKKU_18",
    preview: "취업 게시판 보고 연락드려요. 인턴 지원 일정 정리본 공유 가능할까요?",
    time: "1시간 전",
    unread: false,
  },
] as const;

export function MessagesPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const { loading, isAuthenticated } = useAppRuntime(initialSnapshot);

  return (
    <AppShell title="쪽지">
      {loading ? <LoadingState /> : null}
      {!isAuthenticated ? (
        <EmptyState
          title="로그인 후 쪽지를 확인할 수 있습니다"
          description="교환 글, 입시 답변, 커뮤니티 대화를 탭 바깥에서 바로 이어볼 수 있게 준비 중입니다."
          actionLabel="로그인"
          href="/login?next=/messages"
        />
      ) : (
        <div className="divide-y divide-gray-100">
          {SAMPLE_THREADS.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-colors duration-150 hover:bg-gray-50 active:scale-[0.99]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900">{thread.handle}</p>
                  {thread.unread ? <span className="h-2 w-2 rounded-full bg-indigo-500" /> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{thread.preview}</p>
              </div>
              <span className="shrink-0 text-xs text-gray-400">{thread.time}</span>
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
