# CAMVERSE iOS 릴리즈

## 1. 프로젝트 동기화

```bash
npm install
npm run mobile:assets:ios
npm run mobile:sync:ios
```

## 1-1. CLI 빌드 확인

```bash
npm run mobile:build:ios
```

## 2. Xcode 열기

```bash
npm run mobile:open:ios
```

- Xcode에서 `ios/App/App.xcodeproj`를 엽니다.
- `App` 타깃의 `Signing & Capabilities`는 `T7568AP66M` 기준으로 맞춰져 있습니다.
- Xcode `Settings > Accounts`에 Apple Developer 계정 로그인이 되어 있어야 합니다.
- Bundle Identifier가 필요하면 `CAPACITOR_APP_ID` 기준으로 조정합니다.

## 3. 앱 기본값

- 앱 이름: `CAMVERSE`
- 기본 Bundle ID: `kr.universeapp.camverse`
- 로드 URL: `https://www.universeapp.kr`
- 앱 아이콘: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
- 스플래시: `ios/App/App/Assets.xcassets/Splash.imageset/*`

## 4. 테스트

- iPhone 시뮬레이터 실행
- 로그인
- 홈 / 커뮤니티 / 우리학교 / 알림 / 프로필 진입
- 프로필 사진 업로드
- 수강교환 상세/채팅 진입
- 관리자 로그인

## 5. Archive

```bash
npm run mobile:archive:ios
```

- 산출물: `build/CAMVERSE.xcarchive`
- 기본값은 로컬 검증용 unsigned archive
- 서명된 archive가 필요하면 아래처럼 실행

```bash
IOS_CODE_SIGNING_ALLOWED=YES npm run mobile:archive:ios
```

- Xcode Organizer에서 확인하려면 Xcode에서 `Window > Organizer`

## 6. TestFlight

1. 아래 명령으로 export 옵션 생성

```bash
npm run mobile:export-options:ios
```

2. 아래 명령 실행

```bash
IOS_EXPORT_OPTIONS_PLIST=build/ExportOptions-AppStore.plist npm run mobile:export:ios
```

3. 산출물: `build/export`
4. Xcode Organizer 또는 Transporter로 업로드
5. App Store Connect에서 TestFlight 내부 테스트 진행

## 7. App Store Connect 준비

- 앱 이름: `CAMVERSE`
- 서브타이틀
- 설명
- 키워드
- 지원 URL: `https://www.universeapp.kr/support`
- 개인정보처리방침 URL: `https://www.universeapp.kr/privacy`
- 이용약관 URL: `https://www.universeapp.kr/terms`
- 6.7형 / 6.5형 스크린샷
- 개인정보 수집 항목(App Privacy)

## 8. 심사 제출 전 최종 확인

- 로그인/회원가입
- 학생 인증
- 게시글/댓글/투표
- 알림/메시지
- 프로필/사진 업로드
- 관리자 진입 차단/허용
- 앱 아이콘/스플래시 확인
- 딥링크/외부 링크 확인
