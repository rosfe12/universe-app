import { resolveAppUrl } from "@/lib/env";
import { buildPostHref } from "@/lib/post-links";
import type { Post } from "@/types";

export { buildInviteCode } from "@/lib/referral-code";

export type SharePayload = {
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl: string;
  buttonTitle?: string;
};

export function getAppOrigin() {
  return resolveAppUrl("https://universeapp.kr").replace(/\/+$/, "");
}

export function toAbsoluteAppUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${getAppOrigin()}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function createPostSharePayload(post: Pick<Post, "id" | "title" | "content" | "imageUrl">) {
  const trimmed = post.content.replace(/\s+/g, " ").trim();
  const description =
    trimmed.length > 96 ? `${trimmed.slice(0, 93).trimEnd()}...` : trimmed || "CAMVERSE에서 화제인 글";
  const fallbackImageUrl = `/posts/${post.id}/opengraph-image`;

  return {
    title: post.title,
    description,
    imageUrl: toAbsoluteAppUrl(post.imageUrl || fallbackImageUrl),
    linkUrl: toAbsoluteAppUrl(`/posts/${post.id}`),
    buttonTitle: "게시글 보기",
  } satisfies SharePayload;
}

export function createInviteLink(code: string) {
  return toAbsoluteAppUrl(`/invite?code=${encodeURIComponent(code)}`);
}

export function createInviteSharePayload(code: string) {
  return {
    title: "대학생만을 위한 커뮤니티 [CAMVERSE-캠버스]로 초대합니다",
    description: "CAMVERSE 초대",
    imageUrl: toAbsoluteAppUrl("/icons/icon-512.png"),
    linkUrl: createInviteLink(code),
    buttonTitle: "초대 링크 열기",
  } satisfies SharePayload;
}

export function createPostDestinationLink(post: Pick<Post, "id" | "category" | "subcategory" | "tags">) {
  return buildPostHref(post);
}
