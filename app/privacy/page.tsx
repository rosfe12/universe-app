import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { getSupportEmail } from "@/lib/env";

const sections = [
  {
    title: "수집 정보",
    body: "회원가입과 서비스 이용 과정에서 계정 이메일, 로그인 및 세션 유지에 필요한 인증 정보, 유저 유형, 학교, 학과, 입학년도, 학생 인증 상태, 학교 메일 인증 정보, 게시글·댓글·강의평·수강신청 교환글·메시지·채팅·신고·차단·알림·프로필 설정·접속 로그·기기 및 브라우저 정보가 수집될 수 있습니다. 추가 학생 인증이 필요한 경우 학생증 또는 포털 화면 캡처 등 보완 자료를 별도로 받을 수 있습니다.",
  },
  {
    title: "이용 목적",
    body: "수집한 정보는 회원 식별, 로그인 유지, 학생 인증 심사, 학교·학생 권한 제어, 커뮤니티 운영, 프로필 공개 범위 적용, 신고·차단 처리, 부정 이용 방지, 서비스 품질 개선, 고객 문의 대응을 위해 사용합니다.",
  },
  {
    title: "보유 기간",
    body: "회원 정보는 탈퇴 시까지 보관하며, 탈퇴 후에는 법령상 보관 의무가 있는 정보를 제외하고 지체 없이 삭제 또는 비식별 처리합니다. 학생 인증 문서는 검수 완료 후 즉시 삭제하는 것을 원칙으로 하되, 분쟁·오인증 대응을 위해 필요한 경우 최소 기간 동안만 분리 보관 후 삭제할 수 있습니다. 신고·제재·운영 로그는 부정 이용 방지와 서비스 운영을 위해 일정 기간 보관될 수 있습니다.",
  },
  {
    title: "파기 절차와 방법",
    body: "보유 기간이 끝났거나 처리 목적이 달성된 개인정보는 지체 없이 삭제합니다. 전자적 파일은 복구가 어렵도록 기술적 방법으로 삭제하고, 출력물이나 서면 자료는 분쇄 또는 소각 등으로 파기합니다. 학생 인증 문서와 같이 민감도가 높은 자료는 일반 서비스 데이터와 분리하여 관리합니다.",
  },
  {
    title: "처리 위탁 및 외부 인프라",
    body: "CAMVERSE는 서비스 운영을 위해 클라우드 인프라, 인증, 저장소, 이메일 발송 서비스를 이용할 수 있습니다. 회원 인증, 데이터 저장, 이미지 저장, 로그 처리, 이메일 발송이 해당 범위에 포함될 수 있으며, 위탁 또는 외부 인프라 구성이 변경되는 경우 본 방침을 통해 고지합니다.",
  },
  {
    title: "국외 처리 및 이전 가능성",
    body: "서비스 운영 과정에서 Vercel, Supabase, Resend 등 해외 클라우드·플랫폼 사업자의 인프라를 사용할 수 있으며, 이 경우 계정 식별 정보, 서비스 이용 기록, 업로드 파일, 이메일 발송 정보가 해외 서버에서 처리되거나 저장될 수 있습니다. CAMVERSE는 실제 운영 환경과 이전 구조가 확정·변경될 때 이전 받는 자, 이전 국가, 이전 항목, 이용 목적, 보유 기간을 본 방침 또는 별도 고지를 통해 안내합니다.",
  },
  {
    title: "동의 거부와 이용자 권리",
    body: "이용자는 개인정보 수집·이용에 대한 동의를 거부할 수 있으나, 필수 정보 제공에 동의하지 않으면 회원가입, 로그인, 학생 인증, 커뮤니티 기능 이용이 제한될 수 있습니다. 이용자는 자신의 개인정보 열람, 정정, 삭제, 처리정지, 동의 철회를 요청할 수 있습니다.",
  },
  {
    title: "만 14세 미만 아동의 가입 제한",
    body: "CAMVERSE는 만 14세 이상 이용자를 대상으로 합니다. 만 14세 미만 아동은 법정대리인 동의 등 별도 절차 없이는 회원가입할 수 없습니다.",
  },
  {
    title: "제3자 제공 및 마케팅",
    body: "CAMVERSE는 원칙적으로 이용자의 개인정보를 외부 제3자에게 제공하지 않습니다. 제3자 제공이 필요한 경우 제공받는 자, 제공 항목, 제공 목적, 보유 기간, 거부 시 불이익을 별도로 고지하고 필요한 동의를 받습니다. 광고성 정보 수신 동의는 선택 사항이며, 앱 푸시·이메일·문자 수신 동의는 언제든지 철회할 수 있습니다.",
  },
  {
    title: "개인정보 보호 책임 및 문의",
    body: "개인정보 보호와 관련한 문의, 열람·정정·삭제 요청, 학생 인증 문서 삭제 요청, 신고 처리 관련 문의는 아래 연락처로 접수할 수 있습니다. CAMVERSE는 접수된 요청을 합리적인 기간 안에 검토하고 처리합니다.",
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
        개인정보 보호책임자 및 문의 창구: <a href={`mailto:${supportEmail}`}>{supportEmail}</a> · <Link href="/terms">이용약관</Link>
      </p>
    </div>
  );
}
