# ADR 목록

| 번호 | 제목 | 상태 |
|---|---|---|
| [0001](0001-stack-and-monorepo.md) | 기술 스택과 모노레포 구조 (NestJS · Next.js · Postgres/Prisma · pnpm+Turbo) | 채택 |
| [0002](0002-auth-jwt-httponly-cookie.md) | 운영자 인증 — 이메일/비밀번호 + JWT httpOnly 쿠키 | 채택 |
| [0003](0003-html-isolation-separate-origin-csp.md) | 등록 HTML 격리 — 별도 origin + CSP, sanitize 하지 않음 | 채택 |
| [0004](0004-submission-contract-injected-script.md) | 제출 계약 — 첫 `<form>` 을 가로채는 스크립트 주입 | 채택 |
| [0005](0005-visitor-and-metrics-definition.md) | 방문·방문자·전환율 정의와 채널 귀속 | 채택 |
| [0006](0006-deployment-railway-docker.md) | 배포 — Docker 이미지, Railway 서비스 분리 | 채택 |

## 요구사항 해석 시 세운 가정 (요약)

| 불분명한 요구 | 가정 | 근거 ADR |
|---|---|---|
| "방문" / "방문자" | 방문 = 페이지뷰, 방문자 = 익명 쿠키 기준 고유 수 | 0005 |
| "전환율" | 신청 ÷ 방문자 | 0005 |
| "채널별 성과" | 채널 배포 링크로 들어온 방문/신청만. 직접 접근은 제외 | 0005 |
| "HTML 이 관리자 API 에 접근 못 하게" | 별도 origin + CSP `connect-src 'self'`. 스크립트는 제거하지 않음 | 0003 |
| HTML 이 데이터를 보내는 방식 | 서버가 제출 스크립트를 주입. 운영자는 `<form>` 만 있으면 됨 | 0004 |
| 운영자 계정 생성 | 회원가입 없음. 시드로 생성 | 0002 |
| 중복 신청 | 제한 없음. 운영자가 명단에서 판단 | 0005 |
