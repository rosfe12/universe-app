import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { getSupportEmail } from "@/lib/env";

const sections = [
  {
    title: "서비스 이용",
    body: "유니버스는 캠퍼스 생활과 학교 기반 커뮤니티 이용을 위한 서비스입니다. 이용자는 관련 법령과 학교 커뮤니티 운영 기준을 준수해야 합니다.",
  },
  {
    title: "계정과 권한",
    body: "대학생 전용 기능은 학교 메일 인증 완료 상태에서만 사용할 수 있습니다. 인증 정보가 허위로 확인되면 기능 제한 또는 계정 정지가 적용될 수 있습니다.",
  },
  {
    title: "콘텐츠 운영",
    body: "게시글, 댓글, 강의평, 미팅 프로필은 신고와 운영 검토를 거쳐 숨김 또는 제한될 수 있습니다. 금전 거래 유도, 성희롱, 사칭, 허위 정보는 제한 대상입니다.",
  },
];

export default function TermsPage() {
  const supportEmail = getSupportEmail();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-5 py-10">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">유니버스</p>
        <h1 className="text-3xl font-bold tracking-tight">이용약관</h1>
      </div>
      {sections.map((section) => (
        <Card key={section.title}>
          <CardContent className="space-y-2 py-5">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="text-sm leading-7 text-muted-foreground">{section.body}</p>
          </CardContent>
        </Card>
      ))}
      <p className="text-sm text-muted-foreground">
        문의: <a href={`mailto:${supportEmail}`}>{supportEmail}</a> · <Link href="/privacy">개인정보처리방침</Link>
      </p>
    </div>
  );
}
