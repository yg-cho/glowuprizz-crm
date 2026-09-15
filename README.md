# 리드마그넷 CRM 운영 시스템

문서: [시스템 구성도](docs/architecture.md) · [DB 스키마 · ERD](docs/schema.md) · [API](docs/api.md) · [ADR](docs/adr/README.md) · [배포](docs/deploy-railway.md)

## 실행 방법

요구: Docker (Compose v2). 로컬 개발은 Node 22+, pnpm 10 추가.

### A. Docker Compose 로 전체 실행

```bash
cp .env.example .env
docker compose up -d --build
```

- 관리자 화면: http://localhost:3000 — 로그인 `admin@glowuprizz.com` / `Password123!`
- 관리자 API Swagger: http://localhost:3001/docs
- 공개 폼 서버: http://127.0.0.1:3002 (Swagger `/docs`) — 배포 링크는 이 호스트로 발급됩니다. 관리자(`localhost`)와 호스트가 달라 쿠키가 분리됩니다.

api 컨테이너가 기동할 때 DB 마이그레이션과 운영자 시드를 자동 수행합니다. 시드 계정은 `.env` 의 `SEED_OPERATOR_EMAIL` / `SEED_OPERATOR_PASSWORD` 로 바꿀 수 있습니다.

시작용 샘플 HTML 폼: [`fixtures/sample-form.html`](fixtures/sample-form.html) — 관리자 화면 > HTML 템플릿에서 업로드.

종료: `docker compose down` (데이터 삭제까지: `docker compose down -v`)

### B. 로컬 개발 모드

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres postgres-test   # 개발 DB :5432, 테스트 DB :5433
pnpm db:migrate                               # prisma migrate dev
pnpm db:seed                                  # 운영자 시드
pnpm dev                                      # api :3001, forms :3002, web :3000
```

## 테스트 방법

테스트는 실제 PostgreSQL(테스트 컨테이너, 포트 5433)을 사용합니다. 각 테스트 파일 시작 시 마이그레이션을 적용하고 테이블을 비웁니다.

```bash
pnpm install
docker compose up -d postgres-test

# 1) 관리자 API e2e — 인증 성공/실패, 템플릿 등록 검증, 캠페인/폼/링크, 성과 집계, CRM 명단, 타 운영자 접근 차단
pnpm --filter @glowuprizz/api test:e2e

# 2) 공개 폼 e2e — 링크 렌더/스크립트 주입/CSP 헤더, 방문·방문자 집계, 제출 성공/실패, 일시중지
pnpm --filter @glowuprizz/forms test:e2e

# 1)+2) 한 번에 (순차 실행)
pnpm test:e2e
```

브라우저 e2e (Playwright) — 실제 브라우저에서 방문자 제출 흐름, 관리자 화면 조작, 등록 HTML 의 관리자 API/쿠키 접근 차단을 검증합니다.

```bash
pnpm --filter @glowuprizz/e2e exec playwright install chromium   # 최초 1회
pnpm dev                                                          # 다른 터미널에서 dev 서버 3개 기동
pnpm --filter @glowuprizz/e2e test
```

배포된 환경에 대해 실행하려면 URL 을 환경변수로 넘깁니다:

```bash
E2E_NO_SERVER=1 E2E_WEB_URL=https://<web> E2E_API_URL=https://<api> E2E_FORMS_URL=https://<forms> \
  pnpm --filter @glowuprizz/e2e test
```
