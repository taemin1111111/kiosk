# 프론트엔드 구조

## 개요
- **모바일/키오스크** (사용자): Figma 모바일 기준, 360px 캔버스
- **백오피스** (관리자): Figma 백오피스 웹 기준, PC 레이아웃
- **공통**: API, 유틸, 인증 로직 등

## 폴더 구조

```
src/
├── api/           # 공통 API (모바일/백오피스 모두 사용)
├── utils/         # 공통 유틸 (figmaScale 등)
├── assets/        # 공통 에셋 (로고, 아이콘)
├── hooks/         # 공통 훅
│
├── mobile/        # 모바일/키오스크 UI
│   ├── layout/    MobileLayout.jsx
│   └── pages/     MobileLogin, MobileSignup, MobileNotFound
│
├── admin/         # 백오피스 UI
│   ├── layout/    AdminLayout.jsx
│   └── pages/     AdminLogin, (TODO: AdminMenu, AdminOrders)
│
├── styles/
│   ├── global.css
│   ├── mobile/
│   │   ├── index.css         # @import 통합
│   │   ├── mobile-common.css # figma360-stage 등 공통
│   │   ├── login.css         # login01__*
│   │   ├── signup.css        # signup__*
│   │   └── order.css         # (추가 시)
│   └── admin/
│       ├── index.css         # @import 통합
│       ├── admin-common.css
│       └── admin-login.css
│
├── App.jsx        # 라우팅
└── main.jsx
```

## 라우팅

| 경로 | 화면 |
|------|------|
| `/` | 모바일 로그인 |
| `/signup` | 모바일 회원가입 |
| `/admin` | 백오피스 로그인 |
| `/admin/login` | 백오피스 로그인 |

## CSS 분리
- `global.css`: *, body, .app
- `mobile.css`: figma360-stage, login01__, signup__
- `admin.css`: admin-layout, admin-login
