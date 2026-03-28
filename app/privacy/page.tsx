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
    body: "회원 정보는 탈퇴 시까지 보관하며, 탈퇴 후에는 법령상 보관 의무가 있는 정보를 제외하고 지체 없이 삭제 또는 비식별 처리합니다. 학생 인증 문서는 승인 또는 반려 후 즉시 삭제하는 것을 원칙으로 하되, 분쟁·오인증 대응이 필요한 경우에만 분리 보관 후 삭제할 수 있습니다. 신고·제재·운영 로그는 부정 이용 방지와 서비스 운영을 위해 필요한 범위에서 일정 기간 보관될 수 있습니다.",
  },
  {
    title: "파기 절차와 방법",
    body: "보유 기간이 끝났거나 처리 목적이 달성된 개인정보는 지체 없이 삭제합니다. 전자적 파일은 복구가 어렵도록 기술적 방법으로 삭제하고, 출력물이나 서면 자료는 분쇄 또는 소각 등으로 파기합니다. 학생 인증 문서와 같이 민감도가 높은 자료는 일반 서비스 데이터와 분리하여 관리합니다.",
  },
  {
    title: "처리 위탁 및 외부 인프라",
    body: "CAMVERSE는 서비스 운영을 위해 외부 서비스 사업자를 이용할 수 있습니다. 현재 기준으로 Vercel Inc.는 웹 서비스 배포·호스팅, Supabase Pte. Ltd.는 회원 인증·데이터베이스·파일 저장, Resend, Inc.는 서비스 메일 발송 업무를 처리할 수 있습니다. 위탁 또는 외부 인프라 구성이 변경되면 본 방침을 통해 고지합니다.",
  },
  {
    title: "국외 처리 및 이전 가능성",
    body: "서비스 운영 과정에서 해외 사업자의 인프라를 이용할 수 있습니다. Vercel Inc.는 웹 서비스 제공을 위해 미국 등 글로벌 인프라에서 접속 정보와 서비스 로그를 처리할 수 있고, Supabase Pte. Ltd.는 회원 인증·데이터 저장·파일 저장을 위해 선택된 리전의 서버에서 계정 정보, 게시글, 메시지, 업로드 파일을 처리할 수 있으며, Resend, Inc.는 서비스 메일 발송을 위해 이메일 주소와 발송 정보를 미국 등에서 처리할 수 있습니다. 실제 처리 국가나 리전이 변경되는 경우 본 방침에 반영합니다.",
  },
  {
    title: "자동 수집 장치 및 로그",
    body: "서비스는 로그인 유지, 보안, 성능 개선을 위해 세션 쿠키, 로컬 저장소, 접속 로그, 브라우저·기기 정보를 처리할 수 있습니다. 이러한 정보는 인증 유지, 오류 분석, 부정 이용 방지, 서비스 품질 개선 목적 범위에서 사용됩니다.",
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
    body: "개인정보 보호책임자는 김화현입니다. 개인정보 보호와 관련한 문의, 열람·정정·삭제 요청, 학생 인증 문서 삭제 요청, 신고 처리 관련 문의는 아래 연락처로 접수할 수 있으며, CAMVERSE는 접수된 요청을 합리적인 기간 안에 검토하고 처리합니다.",
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
