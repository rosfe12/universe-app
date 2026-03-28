# CAMVERSE Android 릴리즈

## 0. 필수 환경

- JDK 21
- Android Studio
- Android SDK

## 1. 프로젝트 동기화

```bash
npm install
npm run mobile:assets:android
npm run mobile:sync:android
```

## 2. CLI 빌드 확인

```bash
npm run mobile:doctor:android
```

```bash
npm run mobile:build:android
```

## 3. Android Studio 열기

```bash
npm run mobile:open:android
```

## 4. 앱 기본값

- 앱 이름: `CAMVERSE`
- 기본 Application ID: `kr.universeapp.camverse`
- 로드 URL: `https://www.universeapp.kr`
- 앱 아이콘: `android/app/src/main/res/mipmap-*/ic_launcher.png`
- 스플래시: `android/app/src/main/res/drawable*/splash.png`

## 5. 서명

1. Android Studio에서 `Build > Generate Signed Bundle / APK`
2. `Android App Bundle`
3. keystore 생성 또는 기존 keystore 선택
4. `release` 빌드 타입 선택

## 6. AAB 생성

```bash
npm run mobile:bundle:android
```

- 산출물: `android/app/build/outputs/bundle/release/app-release.aab`

## 7. Play Console 준비

- 앱 이름: `CAMVERSE`
- 설명
- 개인정보처리방침 URL: `https://www.universeapp.kr/privacy`
- 이용약관 URL: `https://www.universeapp.kr/terms`
- 지원 URL: `https://www.universeapp.kr/support`
- 휴대전화 스크린샷
- Data safety
- 콘텐츠 등급

## 8. 심사 전 확인

- 로그인/회원가입
- 학생 인증
- 게시글/댓글/투표
- 알림/메시지
- 프로필/사진 업로드
- 수강교환
- 관리자 차단
