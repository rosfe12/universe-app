import { CAREER_BOARD_LABELS } from "@/lib/constants";
import type { CommunitySubcategory, Post } from "@/types";

type PostLinkInput = Pick<Post, "id" | "category" | "subcategory" | "tags">;

export function getCareerBoardKindFromPost(post: Pick<Post, "category" | "tags">) {
  if (post.category !== "community") return undefined;
  if (post.tags?.includes(CAREER_BOARD_LABELS.jobPosting)) return "jobPosting" as const;
  if (post.tags?.includes(CAREER_BOARD_LABELS.careerInfo)) return "careerInfo" as const;
  return undefined;
}

export function getCommunityFilterFromPost(
  post: Pick<Post, "category" | "subcategory" | "tags">,
) {
  const careerBoard = getCareerBoardKindFromPost(post);
  if (careerBoard) return "career" as const;
  if (post.subcategory === "anonymous") return "anonymous" as const;
  if (post.subcategory === "free") return "free" as const;
  if (post.subcategory === "ask") return "ask" as const;
  if (post.subcategory === "hot") return "hot" as const;
  return "advice" as const;
}

export function buildPostHref(post: PostLinkInput) {
  if (post.category === "admission") {
    return `/school?tab=admission&post=${post.id}`;
  }

  if (post.category === "dating") {
    if (post.subcategory === "meeting" || post.subcategory === "dating") {
      return `/dating?filter=${post.subcategory}&post=${post.id}`;
    }

    return `/dating?post=${post.id}`;
  }

  if (post.subcategory === "school") return `/school?tab=school&post=${post.id}`;
  if (post.subcategory === "freshman") return `/school?tab=freshman&post=${post.id}`;
  if (post.subcategory === "club") return `/school?tab=club&post=${post.id}`;
  if (post.subcategory === "food") return `/school?tab=food&post=${post.id}`;

  return `/community?filter=${getCommunityFilterFromPost({
    category: post.category,
    subcategory: post.subcategory as CommunitySubcategory | "dating" | "meeting" | undefined,
    tags: post.tags,
  })}&post=${post.id}`;
}
