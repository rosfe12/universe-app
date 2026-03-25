import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadServerRuntimeSnapshot } from "@/lib/supabase/server-data";
import { buildPostHref } from "@/lib/post-links";
import { createPostSharePayload } from "@/lib/share-utils";

async function loadSharedPost(postId: string) {
  const snapshot = await loadServerRuntimeSnapshot("full");
  const post = snapshot.posts.find((item) => item.id === postId);
  const school = post?.schoolId ? snapshot.schools.find((item) => item.id === post.schoolId) : undefined;
  return {
    post,
    schoolName: school?.name,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { post } = await loadSharedPost(id);

  if (!post) {
    return {
      title: "게시글을 찾을 수 없습니다 | CAMVERSE",
      description: "CAMVERSE에서 게시글을 확인해보세요.",
    };
  }

  const payload = createPostSharePayload(post);

  return {
    title: `${post.title} | CAMVERSE`,
    description: payload.description,
    openGraph: {
      title: post.title,
      description: payload.description,
      images: payload.imageUrl ? [payload.imageUrl] : [],
      url: payload.linkUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: payload.description,
      images: payload.imageUrl ? [payload.imageUrl] : [],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { post, schoolName } = await loadSharedPost(id);

  if (!post) {
    notFound();
  }

  const appHref = buildPostHref(post);
  const sharePayload = createPostSharePayload(post);

  return (
    <AppShell title="공유된 게시글" showTabs={false}>
      <Card className="overflow-hidden border-white/10 bg-white/[0.04]">
        <CardContent className="space-y-5 py-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{post.category === "admission" ? "입시" : "커뮤니티"}</Badge>
            {schoolName ? <Badge variant="secondary">{schoolName}</Badge> : null}
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{post.title}</h2>
            <p className="text-sm leading-7 text-slate-300">{sharePayload.description}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/10 p-4 text-sm text-slate-300">
            CAMVERSE에서 더 많은 댓글과 반응을 바로 확인할 수 있습니다.
          </div>
          <Button asChild className="w-full">
            <Link href={appHref}>CAMVERSE에서 게시글 보기</Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
