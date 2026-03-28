import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { getSupportEmail } from "@/lib/env";

const sections = [
  {
    title: "서비스 목적과 적용 범위",
    paragraphs: [
      "CAMVERSE (캠버스)는 대학생과 예비입학생을 위한 학교 기반 커뮤니티 서비스입니다.",
      "이용자는 본 약관, 관련 법령, 서비스 운영정책을 준수해야 하며, 학교·학과·학생 인증 상태에 따라 일부 기능 이용 범위가 달라질 수 있습니다.",
    ],
  },
  {
    title: "계정, 인증, 권한",
    paragraphs: [
      "회원가입 시 본인 이메일 인증이 필요하며, 대학생 전용 기능은 학생 인증 상태에 따라 제공됩니다.",
      "허위 학교 정보, 타인 정보 도용, 학생증·포털 화면 위조 등 부정 인증이 확인되면 글쓰기 제한, 계정 정지, 인증 반려, 관련 자료 제출 요청이 적용될 수 있습니다.",
      "CAMVERSE는 만 14세 이상 이용자를 대상으로 하며, 이에 맞지 않는 가입은 제한될 수 있습니다.",
    ],
  },
  {
    title: "콘텐츠 게시와 운영",
    paragraphs: [
      "게시글, 댓글, 강의평, 수강신청 교환 글, 메시지 등 이용자가 작성한 콘텐츠는 신고 및 운영 검토 대상이 될 수 있습니다.",
      "운영팀이 작성한 공지, 가이드, 공식 예시 콘텐츠는 일반 이용자 게시글과 구분되는 표시를 둘 수 있습니다.",
      "사칭, 허위 사실, 불법 촬영물, 음란물, 금전 거래 유도, 성희롱, 권리 침해, 서비스 운영 방해 행위는 사전 통지 없이 숨김·삭제 또는 이용 제한될 수 있습니다.",
    ],
  },
  {
    title: "프로필, 공개 범위, 차단",
    paragraphs: [
      "이용자는 프로필 공개 범위를 설정할 수 있으며, 서비스 정책과 학생 인증 상태에 따라 프로필 및 대표 사진의 노출 범위가 달라질 수 있습니다.",
      "이용자는 다른 이용자를 차단하거나 신고할 수 있으며, 차단 관계에서는 일부 콘텐츠 및 프로필 열람이 제한될 수 있습니다.",
    ],
  },
  {
    title: "신고, 제재, 운영 조치",
    paragraphs: [
      "CAMVERSE는 신고 누적, 운영 검토, 학생 인증 상태, 부정 이용 정황 등에 따라 콘텐츠 숨김, 접근 제한, 기능 제한, 계정 정지, 재인증 요청 등 필요한 조치를 할 수 있습니다.",
      "이용 제한 여부와 범위는 위반 유형, 반복성, 타 이용자 피해 정도를 종합적으로 고려하여 결정합니다.",
    ],
  },
  {
    title: "지식재산권과 금지행위",
    paragraphs: [
      "이용자는 본인이 권리를 보유하거나 적법하게 이용 권한을 가진 콘텐츠만 게시해야 합니다.",
      "타인의 저작물, 초상, 상표, 개인정보를 무단으로 게시하거나, 자동화 수집·스크래핑·서비스 우회 접근·불법 복제·악성 행위를 시도하는 경우 서비스 이용이 제한될 수 있습니다.",
    ],
  },
  {
    title: "탈퇴와 데이터 처리",
    paragraphs: [
      "회원은 언제든지 탈퇴를 요청할 수 있으며, 탈퇴 시 법령상 보관 의무가 있는 정보를 제외한 계정 정보와 활동 데이터는 내부 정책에 따라 삭제 또는 비식별 처리됩니다.",
      "운영상 필요한 경우 신고 기록, 제재 기록, 인증 심사 이력, 운영 로그는 일정 기간 보관될 수 있습니다.",
    ],
  },
  {
    title: "문의, 공지, 약관 변경",
    paragraphs: [
      "중요한 서비스 변경, 운영정책 변경, 권리·의무에 영향을 주는 고지는 앱 내 공지 또는 등록된 이메일을 통해 안내될 수 있습니다.",
      "이용자에게 불리한 약관 변경은 시행일 전 충분한 기간을 두고 고지합니다. 서비스 이용과 개인정보 관련 문의는 아래 연락처로 접수할 수 있습니다.",
    ],
  },
];

export default function TermsPage() {
  const supportEmail = getSupportEmail();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-5 py-10">
      <div className="space-y-2">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">CAMVERSE</p>
          <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground">CAMVERSE (캠버스)</p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">이용약관</h1>
      </div>
      {sections.map((section) => (
        <Card key={section.title}>
          <CardContent className="space-y-2 py-5">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <div className="space-y-2 text-sm leading-7 text-muted-foreground">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      <p className="text-sm text-muted-foreground">
        운영 및 권리침해 문의 <a href={`mailto:${supportEmail}`}>{supportEmail}</a> · 시행일 2026.03.28 ·{" "}
        <Link href="/privacy">개인정보처리방침</Link>
      </p>
    </div>
  );
}
