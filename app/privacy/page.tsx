import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { getSupportEmail } from "@/lib/env";

const sections = [
  {
    title: "수집 정보",
    body: "계정 이메일, 유저 유형, 학교, 학과, 학년, 학교 메일 인증 상태, 서비스 이용 중 생성되는 게시글과 댓글 데이터를 수집합니다.",
  },
  {
    title: "이용 목적",
    body: "회원 식별, 대학생 인증, 학교별 권한 분리, 커뮤니티 안전 운영, 신고 처리, 서비스 품질 개선을 위해 정보를 사용합니다.",
  },
  {
    title: "보관과 삭제",
    body: "법령상 보관이 필요한 경우를 제외하고, 이용자가 삭제를 요청하거나 계정을 종료하면 운영 목적상 필요한 최소 기간 이후 파기합니다.",
  },
];

export default function PrivacyPage() {
  const supportEmail = getSupportEmail();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-5 py-10">
      <div className="space-y-2">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">CAMVERSE</p>
          <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground">CAMVERSE (캠버스)</p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">개인정보처리방침</h1>
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
        문의: <a href={`mailto:${supportEmail}`}>{supportEmail}</a> · <Link href="/terms">이용약관</Link>
      </p>
    </div>
  );
}
