# Grade Validation Frontend

대학별 성적 검증 시스템의 프론트엔드입니다.

## Requirements

- Node.js 22.20 이상
- pnpm 10.x

```powershell
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm install
```

## Run

`.env.example`을 `.env`로 복사한 다음 실행합니다.

```powershell
pnpm start
```

개발 서버는 `http://localhost:3000`에서 실행되며 `/api` 요청을 `http://localhost:8080`의 백엔드로 전달합니다.

## Verify

```powershell
pnpm lint
pnpm build
```
