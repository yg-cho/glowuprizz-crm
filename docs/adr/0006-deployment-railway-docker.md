# ADR-0006: 배포 — Docker 이미지, Railway 서비스 분리

- 상태: 채택
- 날짜: 2026-09-14

## 맥락
데모 URL 을 제출하고 싶다. ADR-0003 의 별도 origin 요건을 배포 환경에서도 만족해야 한다.

## 결정
- 앱별 멀티스테이지 Dockerfile (`docker/*.Dockerfile`). 로컬 `docker compose` 와 Railway 가 같은 이미지를 쓴다.
- Railway 프로젝트에 서비스 4개: `postgres`(플러그인), `api`, `forms`, `web`. 서비스마다 자동 발급되는 `*.up.railway.app` 도메인이 서로 다른 origin 이 된다 — 도메인 구매 없이 격리 충족.
- 마이그레이션은 `api` 서비스 시작 전 `prisma migrate deploy` (compose 에서는 `migrate` 일회성 서비스).
- 환경변수: `FORMS_PUBLIC_ORIGIN`(api 가 링크 URL 생성에 사용), `API_INTERNAL_URL`(web 의 rewrite 대상), `WEB_ORIGIN`(api CORS, Swagger UI 직접 사용 대비).

## 대안
- 단일 VM + compose + Caddy: 로컬과 100% 동일하지만 도메인/TLS/서버 관리 필요.
- Vercel(web) + Railway(나머지): 가능하지만 관리 지점이 둘.

## 결과
README 의 실행 방법은 compose 기준. 데모 URL 은 제출 메일에 기재.
