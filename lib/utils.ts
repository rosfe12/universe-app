import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Post } from "@/types";

const APP_DISPLAY_TIME_ZONE = "Asia/Seoul";
const OFFICIAL_EXAMPLE_AUTHOR_IDS = new Set([
  "a1111111-1111-4111-8111-111111111111",
  "b2222222-2222-4222-8222-222222222222",
  "c3333333-3333-4333-8333-333333333333",
  "d4444444-4444-4444-8444-444444444444",
  "e5555555-5555-4555-8555-555555555555",
  "f6666666-6666-4666-8666-666666666666",
  "18888888-8888-4888-8888-888888888888",
  "19999999-9999-4999-8999-999999999999",
  "77777777-7777-4777-8777-777777777777",
  "2a111111-1111-4111-8111-111111111111",
  "2b222222-2222-4222-8222-222222222222",
  "2c333333-3333-4333-8333-333333333333",
  "2d444444-4444-4444-8444-444444444444",
  "2e111111-1111-4111-8111-111111111111",
  "2f222222-2222-4222-8222-222222222222",
  "3a333333-3333-4333-8333-333333333333",
  "3b444444-4444-4444-8444-444444444444",
  "3c555555-5555-4555-8555-555555555555",
  "3d666666-6666-4666-8666-666666666666",
  "3e777777-7777-4777-8777-777777777777",
  "3f888888-8888-4888-8888-888888888888",
  "832499d8-0b27-47f7-8039-28159445447f",
  "f9ebebfa-bcbb-45a2-adce-b6f7e0397d3d",
]);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeLabel(dateString: string) {
  const target = new Date(dateString).getTime();
  if (!Number.isFinite(target)) {
    return "";
  }
  const diff = Date.now() - target;
  const minutes = Math.floor(diff / 1000 / 60);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    timeZone: APP_DISPLAY_TIME_ZONE,
  }).format(new Date(dateString));
}

export function formatAbsoluteDateLabel(dateString: string) {
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_DISPLAY_TIME_ZONE,
  }).format(target);
}

export function average(numbers: number[]) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, current) => sum + current, 0) / numbers.length;
}

export function getPostViewCount(input: {
  viewCount?: number;
  likes: number;
  commentCount: number;
}) {
  if (typeof input.viewCount === "number" && Number.isFinite(input.viewCount)) {
    return input.viewCount;
  }

  return Math.max(32, input.likes * 12 + input.commentCount * 18 + 24);
}

export function isInternalQaTitle(title?: string | null) {
  if (!title) {
    return false;
  }

  return /^\s*\[QA\d*\]/i.test(title);
}

export function getOfficialStarterMeta(
  post?: Pick<Post, "authorId" | "title" | "tags" | "subcategory"> | null,
) {
  if (!post) {
    return null;
  }

  const title = post.title?.trim() ?? "";
  const tags = new Set((post.tags ?? []).filter(Boolean));
  const isOfficialExampleAuthor = OFFICIAL_EXAMPLE_AUTHOR_IDS.has(post.authorId ?? "");
  const hasOfficialSource =
    isOfficialExampleAuthor || title.startsWith("[공식]") || tags.has("공식자료");
  const isFreshmanGuide =
    title.startsWith("[새내기 체크]") ||
    (post.subcategory === "freshman" && hasOfficialSource);

  if (!hasOfficialSource && !isFreshmanGuide) {
    return null;
  }

  return {
    name: "CAMVERSE 운영팀",
    label: isFreshmanGuide ? "공식 예시 콘텐츠" : isOfficialExampleAuthor ? "공식 예시 콘텐츠" : "운영팀 큐레이션",
    badge: isFreshmanGuide ? "운영팀 가이드" : "운영팀",
  };
}
