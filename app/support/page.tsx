import { Card, CardContent } from "@/components/ui/card";
import { getSupportEmail } from "@/lib/env";

export default function SupportPage() {
  const supportEmail = getSupportEmail();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-5 py-10">
      <div className="space-y-2">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">CAMVERSE</p>
          <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground">CAMVERSE (캠버스)</p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">문의하기</h1>
      </div>
      <Card>
        <CardContent className="space-y-3 py-5">
          <h2 className="text-lg font-semibold">운영 문의</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            계정, 학생 인증, 신고 처리, 탈퇴, 권리침해, 제휴 문의는 아래 메일로 접수합니다.
          </p>
          <a
            href={`mailto:${supportEmail}`}
            className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {supportEmail}
          </a>
          <div className="space-y-2 rounded-[20px] border border-border/70 bg-secondary/40 p-4 text-sm leading-6 text-muted-foreground">
            <p>개인정보 보호책임자: 김화현</p>
            <p>개인정보 열람·정정·삭제, 학생 인증 문서 삭제, 제재 이의제기 요청도 같은 메일로 접수할 수 있습니다.</p>
            <p>본인 확인이 필요한 요청은 추가 확인 절차 후 처리될 수 있습니다.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
