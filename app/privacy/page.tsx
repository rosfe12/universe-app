import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { getSupportEmail } from "@/lib/env";

const sections = [
  {
    title: "수집 정보",
    body: "회원가입과 서비스 이용 과정에서 계정 이메일, 비밀번호 인증 정보, 유저 유형, 학교, 학과, 입학년도, 학생 인증 상태, 학교 메일 인증 정보, 서비스 이용기록, 게시글·댓글·강의평·교환글·신고·알림 데이터를 수집할 수 있습니다. 추가 학생 인증이 필요한 경우 학생증 또는 포털 화면 캡처를 별도로 받을 수 있습니다.",
  },
  {
    title: "이용 목적",
    body: "수집한 정보는 회원 식별, 로그인 유지, 대학생 인증 심사, 학교별 권한 제어, 커뮤니티 운영, 신고 처리, 부정 이용 방지, 고객 문의 대응, 서비스 품질 개선을 위해 사용합니다.",
  },
  {
    title: "보유 기간",
    body: "회원 정보는 탈퇴 시까지 보관하며, 탈퇴 후에는 법령상 보관 의무가 있는 정보를 제외하고 지체 없이 삭제 또는 비식별 처리합니다. 학생 인증 문서는 검수 완료 후 내부 정책에 따라 즉시 삭제하거나 최소 기간만 보관합니다.",
  },
  {
    title: "동의 거부와 권리",
    body: "이용자는 개인정보 수집·이용에 대한 동의를 거부할 수 있으나, 필수 정보 제공에 동의하지 않으면 회원가입, 로그인, 학생 인증, 커뮤니티 기능 이용이 제한될 수 있습니다. 이용자는 자신의 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다.",
  },
  {
    title: "제3자 제공 및 마케팅",
    body: "CAMVERSE는 기본적으로 이용자의 개인정보를 외부 제3자에게 제공하지 않습니다. 광고성 정보 수신 동의는 선택 사항이며, 앱 푸시·이메일·문자 수신 동의는 언제든지 철회할 수 있습니다.",
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
