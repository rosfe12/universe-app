import { ImageResponse } from "next/og";

import { loadServerRuntimeSnapshot } from "@/lib/supabase/server-data";

export const runtime = "nodejs";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

function trimText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

async function loadSharedPost(postId: string) {
  const snapshot = await loadServerRuntimeSnapshot("share");
  const post = snapshot.posts.find((item) => item.id === postId);
  const school = post?.schoolId ? snapshot.schools.find((item) => item.id === post.schoolId) : undefined;

  return {
    post,
    schoolName: school?.name ?? "CAMVERSE",
  };
}

function getBoardLabel(post?: { category: string; subcategory?: string | null }) {
  if (!post) return "CAMVERSE";
  if (post.category === "admission") return "입시 Q&A";
  if (post.subcategory === "freshman") return "새내기 게시판";
  if (post.subcategory === "school") return "우리학교";
  return "커뮤니티";
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { post, schoolName } = await loadSharedPost(id);
  const title = trimText(post?.title ?? "CAMVERSE", 58);
  const description = trimText(
    post?.content ?? "대학생만을 위한 익명 커뮤니티 CAMVERSE에서 게시글을 확인해보세요.",
    120,
  );
  const boardLabel = getBoardLabel(post);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 60px",
          background:
            "radial-gradient(circle at top left, rgba(102,126,234,0.28), transparent 32%), linear-gradient(135deg, #081122 0%, #0d1730 55%, #142348 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "0.32em",
                color: "#98aafc",
              }}
            >
              CAMVERSE
            </div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  padding: "10px 18px",
                  borderRadius: 9999,
                  background: "rgba(148, 163, 184, 0.14)",
                  color: "#dbeafe",
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                {boardLabel}
              </div>
              <div
                style={{
                  display: "flex",
                  padding: "10px 18px",
                  borderRadius: 9999,
                  background: "rgba(59, 130, 246, 0.16)",
                  color: "#bfdbfe",
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                {schoolName}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              width: 136,
              height: 136,
              borderRadius: 36,
              background: "linear-gradient(180deg, #8b5cf6 0%, #5b6cff 100%)",
              boxShadow: "0 22px 70px rgba(76, 81, 255, 0.34)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            maxWidth: 980,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 58,
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.04em",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              lineHeight: 1.45,
              color: "rgba(226, 232, 240, 0.88)",
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "rgba(191, 219, 254, 0.92)",
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex" }}>대학생만을 위한 익명 커뮤니티</div>
          <div style={{ display: "flex" }}>universeapp.kr</div>
        </div>
      </div>
    ),
    size,
  );
}
