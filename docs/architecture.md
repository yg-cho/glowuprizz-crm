# 시스템 구성도

이미지: [구성도](diagrams/architecture.png) · [ERD](diagrams/erd.png) · [방문자 흐름](diagrams/visitor-flow.png) · [운영자 흐름](diagrams/operator-flow.png)

## 1. 서비스 구성과 origin 경계

```mermaid
flowchart LR
  subgraph Operator["운영자 (브라우저)"]
    OB[관리자 화면 탭]
  end
  subgraph Visitor["방문자 (인스타/X/유튜브/스레드에서 유입)"]
    VB[공개 폼 탭]
  end

  subgraph AdminOrigin["관리자 origin  ·  web-*.up.railway.app"]
    WEB["apps/web  (Next.js)\n관리자 UI\n/api/* → api 런타임 프록시"]
  end
  subgraph ApiOrigin["관리자 API origin  ·  api-*.up.railway.app"]
    API["apps/api  (NestJS)\n인증 · 템플릿 · 캠페인 · 폼\n링크 · CRM 명단 · 성과\nSwagger /docs"]
  end
  subgraph FormsOrigin["공개 폼 origin  ·  forms-*.up.railway.app"]
    FORMS["apps/forms  (NestJS)\n/l/:code  /f/:slug 렌더\n제출 스크립트 주입 · CSP\n방문 기록 · 제출 저장\n(관리자 라우트 없음)"]
  end
  DB[("PostgreSQL\noperators · html_templates\ncampaigns · forms\ndistribution_links\nvisits · submissions")]

  OB -- "HTTPS, 쿠키 gu_admin (httpOnly)" --> WEB
  WEB -- "private network\n쿠키 그대로 전달" --> API
  API --> DB
  VB -- "HTTPS, 쿠키 gu_vid (httpOnly)" --> FORMS
  FORMS --> DB
  VB -. "fetch → api / web / 외부\n❌ CSP connect-src 'self' 로 차단" .-> API

  classDef origin fill:#f8fafc,stroke:#94a3b8,stroke-dasharray:4 3;
  class AdminOrigin,ApiOrigin,FormsOrigin origin;
```

- 세 origin 은 서로 다른 호스트. 등록 HTML 은 forms origin 에서만 실행되며 관리자 쿠키·DOM·API 에 닿을 수 없다 (ADR-0003).
- forms 프로세스에는 관리자 컨트롤러 코드 자체가 없다. 두 서버가 같은 DB 를 쓰되 forms 는 `visits` / `submissions` 쓰기와 `forms` / `distribution_links` / `html_templates` 읽기만 한다.
- 로컬(docker compose): web `localhost:3000`, api `localhost:3001`, forms `127.0.0.1:3002` — 호스트를 달리해 쿠키 분리.

## 2. 운영자 흐름

```mermaid
sequenceDiagram
  autonumber
  actor Op as 운영자
  participant Web as web (Next.js)
  participant Api as api (NestJS)
  participant DB as PostgreSQL

  Op->>Web: POST /api/auth/login (email, password)
  Web->>Api: 프록시
  Api->>DB: operators 조회, bcrypt 검증
  Api-->>Web: 200 + Set-Cookie gu_admin (JWT, httpOnly)
  Web-->>Op: 대시보드

  Op->>Web: POST /api/templates (multipart .html)
  Web->>Api: 프록시 (쿠키 포함)
  Api->>Api: .html · ≤512KB · <form> 포함 검증
  Api->>DB: html_templates INSERT (원문 그대로)

  Op->>Api: POST /api/campaigns → campaigns
  Op->>Api: POST /api/forms (campaignId, templateId, slug) → forms
  Op->>Api: POST /api/links (formId, channel) ×4
  Api->>DB: distribution_links INSERT (code 8자)
  Api-->>Op: { url: https://forms…/l/{code} }
  Op->>Op: 각 채널에 링크 게시
```

## 3. 방문자 흐름 (채널 링크 → 신청 → 성과)

```mermaid
sequenceDiagram
  autonumber
  actor V as 방문자
  participant F as forms (NestJS)
  participant DB as PostgreSQL
  participant Api as api
  actor Op as 운영자

  V->>F: GET /l/{code}
  F->>DB: distribution_links → forms → html_templates 조회
  F->>F: 폼 ACTIVE 확인, gu_vid 쿠키 발급/읽기
  F->>DB: visits INSERT (formId, linkId, visitorId, ipHash)
  F->>F: 원본 HTML 끝에 제출 스크립트 주입
  F-->>V: 200 text/html + CSP (connect-src 'self', frame-ancestors 'none')

  V->>V: 폼 작성 (운영자 HTML 의 JS 정상 동작)
  V->>F: submit → 스크립트가 가로채 POST /f/{slug}/submissions {linkCode, fields}
  F->>F: 필드 ≤50 · 값 ≤2000자 · linkCode 가 이 폼 소속인지 확인
  F->>DB: submissions INSERT (payload JSONB, linkId, visitorId)
  F-->>V: 201 → "신청 완료" 표시

  Op->>Api: GET /api/stats/campaigns · /api/stats/channels
  Api->>DB: visits / submissions 집계 (COUNT, COUNT DISTINCT visitorId)
  Api-->>Op: 방문 · 방문자 · 신청 · 전환율(신청÷방문자)
  Op->>Api: GET /api/submissions → CRM 명단
```

## 4. 데이터 모델

ERD 와 테이블 설명은 [schema.md](schema.md) 참고.
