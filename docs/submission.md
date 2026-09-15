# 제출 정보

- 저장소: https://github.com/yg-cho/glowuprizz-crm
- 데모 (관리자): https://web-production-4d66a.up.railway.app
  - 로그인: `admin@glowuprizz.com` / `Password123!`
- 데모 (관리자 API Swagger): https://api-production-fd80.up.railway.app/docs
- 데모 (공개 폼 서버): https://forms-production-7e88.up.railway.app — 배포 링크는 관리자 화면에서 발급 (예: `/l/rt2xh5sz`)
- 필수 기능 중 완료하지 못한 항목: 없음

## 산출물 위치

| 산출물 | 위치 |
|---|---|
| 실행 가능한 소스 | 저장소 루트 (`apps/api`, `apps/forms`, `apps/web`, `packages/*`) |
| DB 스키마 · 마이그레이션 | `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/`, 설명·ERD `docs/schema.md`, `docs/diagrams/erd.png` |
| 시스템 구성도 · 흐름도 | `docs/architecture.md`, `docs/diagrams/*.png` |
| `.env.example` | 루트 |
| 테스트 코드 | `apps/api/test`, `apps/forms/test` (Jest e2e), `apps/e2e/tests` (Playwright) |
| API 문서 | `docs/api.md` + 각 서버 `/docs` (Swagger) |
| README | 루트 — 실행 방법 · 테스트 방법 |
| ADR | `docs/adr/` (0001~0006, 인덱스 `docs/adr/README.md`) |

## 검증 결과 (2026-09-14)

| 검증 | 결과 |
|---|---|
| 관리자 API e2e (Jest, 실제 Postgres) | 27/27 (인증·도메인·퍼널 집계) |
| 공개 폼 e2e (Jest, 실제 Postgres) | 14/14 (렌더·이벤트 수집·제출) |
| 브라우저 e2e (Playwright) — docker compose | 5/5 (퍼널 화면 3종 방문자 시나리오 포함) |
| `docker compose up -d --build` 전체 스택 | 로그인 → 업로드 → 링크 → 방문 → 제출 → 성과 정상 |

## 데모 시나리오 (3분)

1. 관리자 로그인 → **HTML 템플릿** 에서 `fixtures/sample-form.html` 업로드
2. **캠페인 · 폼** 에서 캠페인 생성 → 템플릿 선택해 폼 생성
3. 폼 상세에서 인스타그램 / 유튜브 링크 생성 → 복사
4. 시크릿 창에서 링크 열기 → 폼 작성·제출 (전화번호 자동 포맷 = 운영자 HTML 의 JS 가 살아 있음)
5. **대시보드** 에서 5단계 퍼널(클릭→폼 도달→작성→제출→완료)·최대 이탈 구간·채널 비교·일별 추이 확인, **캠페인 상세** 에서 링크별·폼 A/B·시간대 히트맵, **CRM 명단** 에서 신청자 여정 펼치기와 '작성만 하고 미신청' 탭
6. (격리 확인) 공개 폼 devtools → Application → Cookies 에 `gu_admin` 없음, Console 에서 `fetch('https://api-production-fd80.up.railway.app/api/submissions')` 가 CSP 로 차단됨
