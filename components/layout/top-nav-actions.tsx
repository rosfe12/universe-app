"use client";

import Link from "next/link";
import { CircleUserRound, MessagesSquare, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getPostHref } from "@/lib/mock-queries";
import { isSupabaseEnabled } from "@/lib/supabase/app-data";
import { cn } from "@/lib/utils";

function getSearchScore(input: {
  title: string;
  body?: string;
  meta?: string;
  query: string;
}) {
  const query = input.query.trim().toLowerCase();
  if (!query) return 0;

  const title = input.title.toLowerCase();
  const body = (input.body ?? "").toLowerCase();
  const meta = (input.meta ?? "").toLowerCase();

  let score = 0;

  if (title === query) score += 160;
  if (title.startsWith(query)) score += 120;
  if (title.includes(query)) score += 80;
  if (meta.startsWith(query)) score += 48;
  if (meta.includes(query)) score += 28;
  if (body.includes(query)) score += 20;

  return score;
}

function isMessageNotification(type: string) {
  return (
    type === "comment" ||
    type === "reply" ||
    type === "admissionAnswer" ||
    type === "tradeMatch"
  );
}

export function TopNavActions() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const {
    currentUser,
    isAuthenticated,
    notifications,
    posts,
    lectures,
    loading: runtimeLoading,
    source,
  } = useAppRuntime(undefined, open ? "search" : "chrome");
  const unreadMessageCount =
    runtimeLoading || (isSupabaseEnabled() && source === "mock")
      ? 0
      : notifications.filter((item) => !item.isRead && isMessageNotification(item.type)).length;

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const postItems = posts
      .map((post) => {
        const meta =
          post.category === "admission"
            ? "입시"
            : post.category === "community" && post.schoolId
              ? "우리학교"
              : post.category === "dating"
                ? "연애/미팅"
                : "커뮤니티";

        return {
          id: post.id,
          title: post.title,
          meta,
          href: getPostHref(post.id),
          score: getSearchScore({
            title: post.title,
            body: post.content,
            meta,
            query: normalized,
          }),
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((post) => ({
        id: `post-${post.id}`,
        title: post.title,
        meta: post.meta,
        href: post.href,
      }));

    const lectureItems = lectures
      .map((lecture) => {
        const meta = `${lecture.professor} · ${lecture.department} · 강의정보`;

        return {
          id: `lecture-${lecture.id}`,
          title: lecture.courseName,
          meta,
          href: `/lectures/${lecture.id}`,
          score: getSearchScore({
            title: lecture.courseName,
            body: lecture.dayTime,
            meta,
            query: normalized,
          }),
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((lecture) => ({
        id: `lecture-${lecture.id}`,
        title: lecture.title,
        meta: lecture.meta,
        href: lecture.href,
      }));

    if (normalized) {
      return [...postItems, ...lectureItems].slice(0, 8);
    }

    return posts
      .slice()
      .sort((a, b) => b.likes + b.commentCount * 2 - (a.likes + a.commentCount * 2))
      .slice(0, 6)
      .map((post) => ({
        id: `fallback-${post.id}`,
        title: post.title,
        meta:
          post.category === "admission"
            ? "입시"
            : post.category === "community" && post.schoolId
              ? "우리학교"
              : post.category === "dating"
                ? "연애/미팅"
                : "커뮤니티",
        href: getPostHref(post.id),
      }));
  }, [lectures, posts, query]);

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="검색"
          onClick={() => setOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>
        <Button asChild size="icon" variant="ghost" aria-label="메시지">
          <Link href="/messages" className="relative">
            <MessagesSquare className="h-5 w-5" />
            {unreadMessageCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold leading-4 text-white">
                {Math.min(unreadMessageCount, 9)}
              </span>
            ) : null}
          </Link>
        </Button>
        <Button asChild size="icon" variant="ghost" aria-label="프로필">
          <Link href={isAuthenticated ? `/profile/${currentUser.id}` : "/profile"}>
            <CircleUserRound className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[calc(env(safe-area-inset-top)+0.75rem)] w-[calc(100vw-1rem)] max-w-[440px] -translate-x-1/2 translate-y-0 gap-3 overflow-hidden rounded-[24px] border border-white/80 p-4 md:top-1/2 md:w-full md:-translate-y-1/2">
          <DialogHeader className="space-y-1 pr-8">
            <DialogTitle>검색</DialogTitle>
            <DialogDescription>게시글과 강의정보를 바로 찾을 수 있습니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              className="text-base md:text-sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목, 내용, 강의명, 교수명 검색"
              autoFocus
            />
            <div className="max-h-[min(58vh,420px)] overflow-y-auto overscroll-contain rounded-2xl border border-gray-100">
              {runtimeLoading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">검색 항목을 불러오는 중입니다.</div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-white/10">
                  {searchResults.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{item.meta}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full bg-indigo-400")} />
              최근 반응이 높은 글부터 추천합니다.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
