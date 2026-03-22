"use client";

import Link from "next/link";
import { MessagesSquare, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCareerBoardKind } from "@/lib/mock-queries";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import { cn } from "@/lib/utils";

function getCommunityFilter(postId: string) {
  const snapshot = getRuntimeSnapshot();
  const post = snapshot.posts.find((item) => item.id === postId);
  if (!post) return "all";
  const careerBoard = getCareerBoardKind(post);
  if (careerBoard) return "career";
  if (post.subcategory === "free") return "free";
  if (post.subcategory === "ask") return "ask";
  if (post.subcategory === "hot") return "hot";
  return "advice";
}

function getPostHref(postId: string) {
  const snapshot = getRuntimeSnapshot();
  const post = snapshot.posts.find((item) => item.id === postId);
  if (!post) return "/home";

  if (post.category === "admission") {
    return `/admission/${post.id}`;
  }

  if (post.category === "dating") {
    return "/dating";
  }

  if (post.subcategory === "freshman") return "/school?tab=freshman";
  if (post.subcategory === "club") return "/school?tab=club";
  if (post.subcategory === "food") return "/school?tab=food";

  return `/community?filter=${getCommunityFilter(post.id)}&post=${post.id}`;
}

export function TopNavActions() {
  const snapshot = getRuntimeSnapshot();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const postItems = snapshot.posts
      .filter((post) => {
        if (!normalized) return false;
        return (
          post.title.toLowerCase().includes(normalized) ||
          post.content.toLowerCase().includes(normalized)
        );
      })
      .slice(0, 6)
      .map((post) => ({
        id: `post-${post.id}`,
        title: post.title,
        meta: post.category === "admission" ? "입시" : post.category === "dating" ? "연애/미팅" : "커뮤니티",
        href: getPostHref(post.id),
      }));

    const lectureItems = snapshot.lectures
      .filter((lecture) => {
        if (!normalized) return false;
        return (
          lecture.courseName.toLowerCase().includes(normalized) ||
          lecture.professor.toLowerCase().includes(normalized)
        );
      })
      .slice(0, 4)
      .map((lecture) => ({
        id: `lecture-${lecture.id}`,
        title: lecture.courseName,
        meta: `${lecture.professor} · 강의정보`,
        href: `/lectures/${lecture.id}`,
      }));

    if (normalized) {
      return [...postItems, ...lectureItems].slice(0, 8);
    }

    return snapshot.posts
      .slice()
      .sort((a, b) => b.likes + b.commentCount * 2 - (a.likes + a.commentCount * 2))
      .slice(0, 6)
      .map((post) => ({
        id: `fallback-${post.id}`,
        title: post.title,
        meta: post.category === "admission" ? "입시" : post.category === "dating" ? "연애/미팅" : "커뮤니티",
        href: getPostHref(post.id),
      }));
  }, [query, snapshot.lectures, snapshot.posts]);

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
        <Button asChild size="icon" variant="ghost" aria-label="쪽지">
          <Link href="/messages">
            <MessagesSquare className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto rounded-[24px] p-5">
          <DialogHeader className="space-y-1">
            <DialogTitle>검색</DialogTitle>
            <DialogDescription>게시글과 강의정보를 바로 찾을 수 있습니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목, 내용, 강의명, 교수명 검색"
              autoFocus
            />
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              {searchResults.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {searchResults.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 transition-colors duration-150 hover:bg-gray-50"
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
