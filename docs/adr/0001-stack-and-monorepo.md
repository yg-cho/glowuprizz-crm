# ADR-0001: 기술 스택과 모노레포 구조

- 상태: 채택
- 날짜: 2026-09-14

## 맥락
3일 기한. 관리자 UI, 관리자 API, 공개 폼 서빙, RDB 가 필요하다. 인증 정보 격리 요건 때문에 공개 폼은 관리자와 다른 origin 에서 서빙해야 한다.

## 결정
- 백엔드: **NestJS (TypeScript)** — 데코레이터 기반 Swagger 로 API 문서 자동 생성, Jest + supertest e2e 가 빠르다.
- 프론트: **Next.js (App Router)** 별도 앱. `/api/*` 를 api 서버로 rewrite 프록시해 인증 쿠키를 web origin 에 묶는다 (CORS 불필요, 배포 도메인 무관).
- DB: **PostgreSQL + Prisma**. `schema.prisma` 가 스키마 문서 역할, 마이그레이션 SQL 자동 생성.
- 모노레포: **pnpm workspaces + Turborepo**. `apps/api`, `apps/forms`, `apps/web`, `packages/db`, `packages/shared`.
- 공개 폼 서버(`apps/forms`)는 **api 와 물리적으로 분리된 앱**. 관리자 컨트롤러 코드 자체가 프로세스에 없다.

## 대안
- Kotlin/Spring: 견고하지만 관리자 UI 를 따로 붙이는 비용과 빌드 시간이 기한에 불리.
- api 안에 공개 라우트 포함 후 도메인만 분리: 코드는 적지만 공격면 분리가 약하다. 별도 앱을 택했다.
- SQLite: 셋업은 쉽지만 Railway 배포·동시성에 제약.

## 결과
앱 3개 + Postgres 를 docker compose 로 로컬 실행. Railway 에 서비스 4개(api/forms/web/postgres) 로 배포.
