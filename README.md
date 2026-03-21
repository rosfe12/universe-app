# 유니버스

캠퍼스 라이프 플랫폼입니다. 입시 정보, 강의평, 수강신청 매칭, 동아리/모임/맛집 커뮤니티, 미팅/연애 기능을 한 앱 안에서 얕고 빠르게 검증할 수 있도록 구성했습니다. 현재 데모는 `건국대학교`를 기준 학교로 잡아 건대입구 생활권과 학교 맥락이 자연스럽게 이어지도록 맞췄습니다.

## 기술 스택

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 스타일 컴포넌트
- Supabase Auth / Postgres 연동
- React Hook Form
- Zod
- Lucide React

## 데모 기준

- 기준 학교: 건국대학교
- 톤앤매너: 건대입구 생활권 기반 모바일 커뮤니티 데모
- 주요 사용 시나리오: 입시 질문 탐색, 강의평 비교, 수강신청 매칭 확인, 커뮤니티 체류, 미팅/연애 카드 열람

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후 `/home`으로 이동합니다.

추가 검증:

```bash
npm run typecheck
npm run lint
npm run build
npm run verify:deploy-config
npm run verify:supabase-setup
npm run verify:live
```

## 환경변수

`.env.example` 기준으로 `.env.local`을 생성합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
NEXT_PUBLIC_AUTH_SITE_URL=http://127.0.0.1:3000
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
NEXT_PUBLIC_SHOW_TEST_ACCOUNTS=false
NEXT_PUBLIC_SUPPORT_EMAIL=support@your-domain.com
NEXT_PUBLIC_SUPPORT_URL=https://your-domain.com/support
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project-ref.supabase.co:5432/postgres
SUPABASE_MIGRATION_DB_URL=postgresql://postgres.project-ref:password@aws-0-your-region.pooler.supabase.com:5432/postgres
SUPABASE_AUTH_SITE_URL=https://your-domain.com
SUPABASE_AUTH_ADDITIONAL_REDIRECT_URLS=http://127.0.0.1:3000/login,http://127.0.0.1:3000/login?next=*,http://127.0.0.1:3000/auth/school-email/callback
SUPABASE_SMTP_HOST=smtp.your-provider.com
SUPABASE_SMTP_PORT=587
SUPABASE_SMTP_USER=your-smtp-user
SUPABASE_SMTP_PASSWORD=your-smtp-password
SUPABASE_SMTP_SENDER_NAME=유니버스
SUPABASE_SMTP_SENDER_EMAIL=no-reply@your-domain.com
E2E_TEST_EMAIL=tester@example.com
E2E_TEST_PASSWORD=secure-password
SCHOOL_VERIFICATION_TEST_EMAIL=qa.verification@example.com
SCHOOL_VERIFICATION_TEST_SCHOOL_EMAIL=qa.verification@konkuk.ac.kr
```

Supabase를 연결하면 로그인/온보딩/주요 CRUD는 실제 데이터로 동작합니다.
환경변수가 없으면 mock 데이터 데모 모드로 자동 fallback 됩니다.
환경변수는 있는데 스키마나 정책이 빠진 상태면 로컬 화면 상단에 설정 경고를 표시합니다.

## 배포 전 Auth 설정

`NEXT_PUBLIC_APP_URL`을 실제 서비스 도메인으로 맞춘 뒤 배포 설정을 검증합니다.

```bash
npm run print:supabase-auth-config
npm run verify:deploy-config
```

- 앱 SMTP(`SUPABASE_SMTP_*`)가 있으면 학교 메일 인증은 앱 서버가 직접 발송합니다.
- 앱 SMTP가 없으면 Supabase Auth 메일 발송 경로로 fallback 됩니다.
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`일 때만 구글 로그인 버튼이 노출됩니다.
- `NEXT_PUBLIC_SHOW_TEST_ACCOUNTS=true`일 때만 로그인 화면에 테스트 계정 안내를 노출합니다.
- 푸터와 문의 페이지는 `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_URL` 값을 사용합니다.
- Google 로그인을 켜는 경우에만 아래 값을 대시보드에 입력합니다.
  - Site URL: `https://your-domain.com`
  - Redirect URLs
    - `https://your-domain.com/login`
    - `https://your-domain.com/login?next=*`
    - `https://your-domain.com/auth/school-email/callback`
    - `http://127.0.0.1:3000/login`
    - `http://127.0.0.1:3000/login?next=*`
    - `http://127.0.0.1:3000/auth/school-email/callback`
  - Google Cloud Authorized JavaScript origins: 앱 도메인 origin
  - Google Cloud Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`

운영 헬스 체크:

```bash
curl https://your-domain.com/api/health
```

학교 메일 인증 템플릿:

- 제목은
  [`supabase/email-templates/student-verification-magic-link.subject.txt`](/Users/rosfe/univers%20app/supabase/email-templates/student-verification-magic-link.subject.txt)
  내용을 사용합니다.
- Supabase Auth > Email Templates > Magic Link에
  [`supabase/email-templates/student-verification-magic-link.html`](/Users/rosfe/univers%20app/supabase/email-templates/student-verification-magic-link.html)
  내용을 붙여넣습니다.
- 버튼 링크는 `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` 형식을 사용합니다.
- 앱 SMTP를 사용할 경우 같은 템플릿을 서버 메일 발송에 재사용합니다.
- 발신자 이름은 `유니버스`, 발신 메일은 운영 도메인 메일을 사용합니다.

## Supabase 연결 순서

```bash
# 1. Supabase 프로젝트 생성
# 2. SQL Editor 또는 psql로 스키마 적용
psql "$SUPABASE_DB_URL" -f supabase/schema.sql

# 3. 기본 계정/글/댓글/강의평/매칭 시드 적용
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

CLI만으로 적용하려면:

```bash
npm run setup:supabase
```

- 현재 작업 환경에서 direct DB 호스트가 막히면 `SUPABASE_MIGRATION_DB_URL`에 Session pooler 연결 문자열을 넣고 실행합니다.
- Supabase Auth URL 설정에는 현재 사용하는 앱 도메인과 `/auth/school-email/callback` 콜백 경로를 허용해야 합니다.

- 스키마: `supabase/schema.sql`
- seed: `supabase/seed.sql`
- `supabase/schema.sql`에는 `media` public bucket 생성, `storage.objects` 업로드 정책, `media_assets` 동기화 트리거까지 포함됩니다.
- 현재 앱 동작 방식: 서버 컴포넌트가 Supabase에서 먼저 스냅샷을 읽고, 빈 데이터이거나 미연결이면 mock fallback
- 로그인/회원가입: `/login`, `/onboarding`
- 학교 메일 인증 콜백: `/auth/school-email/callback`
- `auth.users`에 새 계정이 생성되면 trigger로 `public.users`가 자동 생성됩니다.
- 실제 연결 우선 범위
  - posts 목록 / 상세
  - comments 목록 / 작성
  - lecture_reviews 목록 / 작성
  - trade_posts 목록 / 작성
  - notifications 목록

## 실연동 검증

스키마 적용 후 먼저 준비 상태를 확인합니다.

```bash
npm run verify:supabase-setup
```

- 필수 테이블 존재 여부
- `list_user_public_profiles` RPC 존재 여부
- `SUPABASE_SERVICE_ROLE_KEY`가 있으면 `media` bucket 존재 여부

실제 로그인 + CRUD + Storage 업로드까지 확인하려면 테스트 계정을 설정한 뒤 실행합니다.

```bash
npm run verify:live
```

- Supabase Auth 로그인
- `posts` 작성
- `comments` 작성
- `lecture_reviews` 작성
- `trade_posts` 작성
- `media` bucket 업로드 / public URL 확인
- 검증 후 생성 데이터 cleanup
- `admin_audit_logs` 포함 setup 검증

학교 메일 인증 수동 검증:

```bash
npm run reset:school-verification-test-user
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 npm run generate:school-verification-link -- qa.verification@example.com
```

- 첫 번째 명령은 QA 인증 계정을 초기화합니다.
- 두 번째 명령은 현재 pending 요청 기준 테스트 링크를 출력합니다.
- 실제 사용자 메일 발송 검증은 앱 SMTP 또는 Supabase Auth 메일 설정 후 `/onboarding` UI에서 진행합니다.

## 테스트 계정

- `jiyoon@konkuk.ac.kr` / `univers123`
- `minsu@konkuk.ac.kr` / `univers123`
- `seoyeon@konkuk.ac.kr` / `univers123`
- `dohyun@cau.ac.kr` / `univers123`
- `hayoon@example.com` / `univers123`
- `sujin.hs@example.com` / `univers123`

## seed 구성

`supabase/seed.sql`과 `data/mock-seed.ts`에 동일 톤의 데모 데이터가 정리되어 있습니다.

- 학교 2곳
- 사용자 6명
- 게시글 24개
- 댓글 20개
- 강의 10개
- 강의평 20개
- 수강신청 매칭 글 10개
- 알림 8개

## 주요 페이지

- `/login`: 데모 로그인 화면
- `/onboarding`: 유저 타입 선택 + 학교 인증 흐름
- `/home`: 인기글, 실시간 캠퍼스, 추천 카드, 학교별 핫한 글까지 포함한 허브 화면
- `/admission`: 구조화 입시 질문 목록/작성
- `/admission/[id]`: 질문 상세, 댓글, 답변 채택
- `/lectures`: 강의/교수 검색, 필터
- `/lectures/[id]`: 강의 상세, 구조화 리뷰, 리뷰 작성
- `/trade`: 수강신청 매칭 게시판
- `/community`: 동아리 / 모임 / 맛집 목적형 커뮤니티
- `/dating`: 대학생 전용 미팅 / 연애 피드
- `/profile`: 마이페이지, 내 글/댓글/강의평/매칭 글, 알림 설정
- `/notifications`: 알림 페이지
- `/admin`: 신고 목록, 필터, 상태 변경, 통계 카드

## 폴더 구조

```text
app/
components/
data/
features/
hooks/
lib/
public/
supabase/
types/
```

- `app`: 라우트 엔트리
- `components`: shadcn/ui 스타일 공통 컴포넌트와 레이아웃
- `features`: 도메인별 화면 구현
- `data`: 현실감 있는 mock 데이터와 시드 정의
- `lib`: 권한, 조회 셀렉터, Supabase 클라이언트
- `types`: 도메인 타입 정의
- `supabase`: 스키마 초안

## 구현 메모

- `data/mock-seed.ts`는 데모 fallback 데이터 원본입니다.
- `hooks/use-app-runtime.ts`가 Supabase와 mock 사이의 runtime snapshot을 관리합니다.
- `lib/supabase/app-data.ts`에 브라우저 기준 Auth / CRUD / 로더를 모았습니다.
- `app/actions/content-actions.ts`에 서버 액션 기반 CRUD 예시를 모았습니다.
- `lib/supabase/server.ts`, `lib/supabase/admin.ts`에 서버/관리자 클라이언트를 분리했습니다.
- 공통 카드, 강의 요약 카드, 매칭 카드, 피드 카드 등을 분리해 스타일과 재사용성을 맞췄습니다.

## 데이터 구조

핵심 테이블:

- `users`
- `schools`
- `user_roles`
- `posts`
- `comments`
- `lectures`
- `lecture_reviews`
- `trade_posts`
- `notifications`
- `admin_audit_logs`
- `reports`
- `blocks`
- `dating_profiles`
- `media_assets`

핵심 구조:

- `posts` 한 테이블로 입시 / 커뮤니티 / 연애 글을 처리합니다.
- `scope + school_id` 조합으로 우리학교 전용 데이터와 글로벌 데이터를 나눕니다.
- `trade_posts`, `lectures`, `lecture_reviews`는 학교 기반 데이터로 유지합니다.
- `reports`, `blocks`, `trust_score`, `auto_hidden` 필드로 운영 장치를 기본 내장했습니다.

RLS 요약:

- `posts`
  - `global` 글은 누구나 조회 가능
  - `school` 글은 같은 학교 사용자만 조회 가능
  - 작성/수정/삭제는 본인만 가능
- `comments`
  - 상위 `post` 접근 권한을 따라갑니다.
- `lecture_reviews`
  - 로그인 사용자만 작성 가능
  - 같은 강의 + 같은 학기 사용자당 1회만 작성 가능
- `trade_posts`
  - 대학생(`student`)만 작성 가능
  - 같은 학교 사용자끼리만 조회/작성 가능
- `dating_profiles`
  - 대학생만 접근 가능
- `reports`
  - 로그인 사용자만 신고 가능
  - 동일 대상 중복 신고 불가
- `blocks`
  - 본인 차단 목록만 조회 가능

세부 필드와 정책은 `supabase/schema.sql` 기준으로 확인할 수 있습니다.

## 백엔드 구조

Next.js 서버 액션 기준 기본 엔드포인트:

- `createPost`
- `createComment`
- `createLectureReview`
- `createTradePost`
- `createDatingProfile`
- `reportContent`
- `blockUser`

각 액션은 다음 흐름을 공유합니다.

- 세션 사용자 확인
- `public.users` 프로필 조회
- 사용자 제한 상태 확인
- RLS에 맞는 payload 생성
- 저장 후 관련 경로 revalidate

## 현재 상태

- 하단 탭 고정 모바일 레이아웃
- 홈 허브형 미리보기 카드와 실시간 섹션
- 구조화 입시 질문 / 답변 채택 흐름
- 구조화 강의평 탐색 / 작성 / 항목별 통계
- 수강신청 매칭 게시판과 간단한 매칭 후보 표시
- 목적형 커뮤니티
- 대학생 전용 연애 / 미팅 보드와 신고 / 차단 안내
- 관리자 신고 처리 화면
- 마이페이지 활동 이력과 알림 설정 UI
- Supabase Auth 로그인 / 회원가입 연결
- 입시 질문, 댓글, 강의평, 커뮤니티 글, 미팅 글, 매칭 글, 신고 상태 변경의 실데이터 저장 경로 추가
- 미연결 환경에서는 mock fallback 유지

## 확장 포인트

- 실시간 댓글 / 알림 / 매칭 이벤트를 Realtime로 연결
- Storage 기반 이미지 업로드와 24시간 스토리 확장
- 관리자 권한 및 신고 처리 워크플로 강화
- 학교 인증 고도화와 권한 정책 서버 검증
- 검색 인덱싱과 추천 피드 로직 추가
