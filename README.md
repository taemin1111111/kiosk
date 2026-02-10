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
