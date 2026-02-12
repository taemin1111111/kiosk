# Kiosk

- **Backend**: Node.js (Express)
- **Frontend**: React (Vite)

## 구조

```
kiosk/
├── backend/          # Node.js API
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── middleware/
│   └── package.json
├── frontend/         # React 앱
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── assets/
│   │   └── styles/
│   └── package.json
└── README.md
```

## 실행 방법

### 백엔드

```bash
cd backend
npm install
cp .env.example .env   # 필요 시 수정
npm run dev
```

→ http://localhost:3001 (API: `/api/health` 등)

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

→ http://localhost:5173

프론트엔드에서 `/api` 요청은 Vite 프록시로 백엔드(3001)로 전달됩니다.

---

## 캐시 (홈 메뉴 카테고리 전환)

**위치**: `frontend/src/mobile/pages/MobileMenu.jsx`

**목적**: 카테고리(전체/커피/티 등)를 바꿀 때 목록을 비우지 않고, 이미 불러온 데이터를 바로 보여줘서 **깜빡임 없이** 전환되도록 함.

### 방식

- **메모리 캐시**: `useRef`로 카테고리 id별 상품 목록을 보관 (`productsByCategoryRef`).
- **쿠키/로컬스토리 사용 안 함**: 상품 목록은 용량이 커서 세션 동안만 메모리에 둠. 새로고침 시 캐시는 비워지고 다시 API로 불러옴.

### 동작 흐름

1. **최초 진입**: 카테고리 + "전체" 메뉴 한 번에 fetch → `products` state에 넣고, `productsByCategoryRef.current['all']` 에도 저장.
2. **카테고리 클릭** 시 `useEffect([category])` 에서:
   - **캐시에 해당 카테고리 데이터가 있으면** → `setProducts(cached)` 로 즉시 렌더, `setLoading(false)`. (목록을 `[]`로 비우지 않음.)
   - **캐시에 없으면** → `setLoading(true)` 후 fetch → 응답 오면 `setProducts(list)` + 캐시에 저장.
3. **항상 백그라운드에서 한 번 더 fetch** 해서 최신 데이터로 캐시 갱신. 응답이 올 때 **현재 선택된 카테고리와 같을 때만** `setProducts` 호출해서, 사용자가 이미 다른 카테고리로 바꾼 경우 이전 응답이 화면을 덮지 않도록 함 (`categoryRef` 로 비교).

### 요약

- 캐시 있음 → 0ms에 가깝게 캐시로 렌더 (깜빡임 없음).
- 캐시 없음 → 로딩 표시 후 fetch.
- 리스트 컴포넌트는 리마운트하지 않고, 같은 DOM에서 `products` 만 바꿈.
