# CAMVERSE iOS 릴리즈

## 1. 프로젝트 동기화

```bash
npm install
npm run mobile:assets:ios
npm run mobile:sync:ios
```

## 2. Xcode 열기

```bash
npm run mobile:open:ios
```

- Xcode에서 `ios/App/App.xcodeproj`를 엽니다.
- `App` 타깃의 `Signing & Capabilities`에서 Apple Team을 지정합니다.
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

1. Xcode 상단 디바이스를 `Any iOS Device (arm64)`로 변경
2. `Product > Archive`
3. Organizer에서 Archive 확인

## 6. TestFlight

1. Organizer에서 `Distribute App`
2. `App Store Connect`
3. `Upload`
4. 업로드 후 App Store Connect에서 TestFlight 내부 테스트 진행

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
