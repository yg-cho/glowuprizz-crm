# API 문서

두 서버, 두 origin.

| 서버 | 기본 주소 | 인증 | Swagger |
|---|---|---|---|
| 관리자 API (`apps/api`) | `http://localhost:3001/api` | `gu_admin` httpOnly 쿠키 | `http://localhost:3001/docs` |
| 공개 폼 (`apps/forms`) | `http://127.0.0.1:3002` | 없음 | `http://127.0.0.1:3002/docs` |

관리자 화면(`apps/web`)은 같은 origin 의 `/api/*` 를 관리자 API 로 프록시하므로 브라우저에서는 `http://localhost:3000/api/...` 로 호출된다.

오류 응답 형식(NestJS 기본): `{ "statusCode": 400, "message": "...", "error": "Bad Request" }`. 검증 오류의 `message` 는 문자열 배열.

---

## 1. 인증 `/api/auth`

### POST `/api/auth/login`
운영자 로그인. 성공 시 `Set-Cookie: gu_admin=<jwt>; HttpOnly; SameSite=Lax; Max-Age=43200`.

요청
```json
{ "email": "admin@glowuprizz.com", "password": "Password123!" }
```
응답 200
```json
{ "operator": { "id": "uuid", "email": "admin@glowuprizz.com" } }
```
- 400 형식 오류 · 401 자격 증명 불일치(계정 존재 여부 구분 없음) · 429 분당 10회 초과

### POST `/api/auth/logout` → 204, 쿠키 제거
### GET `/api/auth/me` → 200 `{ operator }` · 401 미인증

이하 모든 관리자 API 는 쿠키 없거나 위조 시 **401**. 다른 운영자의 리소스는 **404**.

---

## 2. HTML 템플릿 `/api/templates`

### POST `/api/templates` — `multipart/form-data`
| 필드 | 타입 | 설명 |
|---|---|---|
| `file` | file | `.html`/`.htm`, ≤ 512KB, `<form>` 1개 이상 필수 |
| `name` | string? | 미입력 시 파일명 |

응답 201 `{ id, name, sizeBytes, createdAt }` · 400 확장자/크기/폼 없음/파일 누락

원문은 수정 없이 저장된다(스크립트 제거 안 함, ADR-0003).

### GET `/api/templates` → `[{ id, name, sizeBytes, createdAt, _count: { forms } }]`
### GET `/api/templates/:id` → 템플릿 + `html` 원문 · 404
### DELETE `/api/templates/:id` → 204 · 사용 중인 폼이 있으면 404 메시지로 거부

---

## 3. 캠페인 `/api/campaigns`

### POST `/api/campaigns`
```json
{ "name": "9월 무료 PT", "description": "선택" }
```
→ 201 `{ id, operatorId, name, description, createdAt }`

### GET `/api/campaigns` → 목록 (+ `_count.forms`)
### GET `/api/campaigns/:id` → 상세 + `forms[]` (각 폼의 `template`, `_count.links`, `_count.submissions`)
### DELETE `/api/campaigns/:id` → 204. 하위 폼/링크/방문/신청 cascade 삭제

---

## 4. 폼 `/api/forms`

### POST `/api/forms`
```json
{ "campaignId": "uuid", "templateId": "uuid", "name": "폼A", "slug": "free-pt" }
```
- `slug` 선택. `^[a-z0-9]+(-[a-z0-9]+)*$`, 3~60자. 미입력 시 8자 자동 생성.
- → 201 `{ id, campaignId, templateId, name, slug, status: "ACTIVE", createdAt }`
- 404 캠페인/템플릿이 내 소유 아님 · 409 slug 중복 · 400 형식

### GET `/api/forms?campaignId=` → 목록 (+ `campaign`, `template`, `_count`)
### GET `/api/forms/:id` → 상세 + `links[]`
### PATCH `/api/forms/:id`
```json
{ "name": "선택", "status": "ACTIVE | PAUSED" }
```
`PAUSED` 이면 공개 URL 은 403, 제출도 403.
### DELETE `/api/forms/:id` → 204

---

## 5. 배포 링크 `/api/links`

### POST `/api/links`
```json
{ "formId": "uuid", "channel": "INSTAGRAM | X | YOUTUBE | THREADS" }
```
→ 201
```json
{ "id": "uuid", "formId": "uuid", "channel": "INSTAGRAM", "code": "htuqbxbe",
  "url": "http://127.0.0.1:3002/l/htuqbxbe", "createdAt": "..." }
```
`url` 은 `FORMS_PUBLIC_ORIGIN` 기준. 코드는 8자(혼동 문자 제외). 채널명은 URL 에 노출되지 않는다.

### GET `/api/links?formId=` → `[...]` (각각 `url` 포함)
### DELETE `/api/links/:id` → 204. 기존 방문/신청은 `linkId = null` 로 보존

---

## 6. CRM 명단 `/api/submissions`

### GET `/api/submissions?formId=&campaignId=&page=1&pageSize=20`
```json
{
  "total": 1, "page": 1, "pageSize": 20,
  "items": [{
    "id": "uuid", "createdAt": "...", "visitorId": "uuid|null", "ipHash": "…",
    "payload": { "name": "홍길동", "phone": "010-1234-5678", "goal": "diet" },
    "form": { "id": "uuid", "name": "폼A", "slug": "free-pt", "campaign": { "id": "uuid", "name": "9월 무료 PT" } },
    "link": { "id": "uuid", "channel": "INSTAGRAM", "code": "htuqbxbe" } | null
  }]
}
```
`pageSize` 최대 100.

---

## 6-1. 신청 여정 `GET /api/submissions/:id/journey`
```json
{ "submission": { "id": "uuid", "formId": "uuid", "visitorId": "uuid", "createdAt": "...", "link": { "id": "uuid", "channel": "INSTAGRAM", "code": "…" } },
  "events": [ /* 방문자의 같은 폼 이벤트, createdAt → 단계 순 */ ], "visits": 2, "secondsToSubmit": 1560 }
```
방문자 쿠키 없이 제출된 건은 `events: []`. 404: 내 소유 아님.

---

---

## 7. 성과 `/api/stats`

정의(ADR-0007): 단계 수 = 해당 이벤트를 1회 이상 낸 **고유 방문자**(`gu_vid`). 단계 = `VIEW`(링크 클릭) → `FORM_VIEW`(폼 도달) → `FORM_START`(작성 시작) → `SUBMIT_ATTEMPT`(제출 시도) → `SUBMIT_SUCCESS`(신청 완료). 실패 = `SUBMIT_ERROR`.

### 공통 쿼리 (모든 `/api/stats/*`)
| 파라미터 | 값 | 기본 |
|---|---|---|
| `range` | `today` `7d` `30d` `90d` `all` `custom` | `7d` (from/to 있으면 `custom`) |
| `from`, `to` | ISO 8601, `[from, to)` | — |
| `compare` | `1`/`true` 이면 같은 길이의 직전 기간도 계산 (`all` 제외) | `false` |
| `campaignId`, `formId` | 내 소유 아니면 404 | — |
| `channel` | `INSTAGRAM` `X` `YOUTUBE` `THREADS` | — |

기간은 KST 자정 기준. 400: 잘못된 range/채널/from≥to.

### GET `/api/stats/funnel`
```json
{
  "range": "7d", "period": { "from": "2026-09-10T15:00:00.000Z", "to": "2026-09-17T15:00:00.000Z" },
  "current": {
    "stages": [
      { "type": "VIEW", "label": "링크 클릭", "visitors": 1284, "stepRate": 1, "cumulativeRate": 1, "dropoff": 0 },
      { "type": "FORM_VIEW", "label": "폼 도달", "visitors": 1190, "stepRate": 0.9268, "cumulativeRate": 0.9268, "dropoff": 94 },
      { "type": "FORM_START", "label": "작성 시작", "visitors": 612, "stepRate": 0.5143, "cumulativeRate": 0.4766, "dropoff": 578 },
      { "type": "SUBMIT_ATTEMPT", "label": "제출 시도", "visitors": 431, "stepRate": 0.7042, "cumulativeRate": 0.3357, "dropoff": 181 },
      { "type": "SUBMIT_SUCCESS", "label": "신청 완료", "visitors": 418, "stepRate": 0.9698, "cumulativeRate": 0.3255, "dropoff": 13 }
    ],
    "pageViews": 1812, "submitErrors": 13, "overallRate": 0.3255, "maxDropStage": "FORM_START"
  },
  "previous": null
}
```
`compare=1` 이면 `previous` 에 같은 구조 + `period`.

### GET `/api/stats/timeseries`
일별(KST). 기간 안의 빈 날은 0.
```json
[{ "day": "2026-09-12", "visitors": 180, "formStarts": 90, "submissions": 61, "conversionRate": 0.3389 }]
```

### GET `/api/stats/channels`
4채널 항상 반환(직접 유입 제외). `share` = 채널 신청 ÷ 전체 신청.
```json
[{ "channel": "INSTAGRAM", "VIEW": 742, "FORM_VIEW": 701, "FORM_START": 402, "SUBMIT_ATTEMPT": 300, "SUBMIT_SUCCESS": 289,
   "pageViews": 1010, "submitErrors": 4, "clickToSubmit": 0.3895, "startToSubmit": 0.7189, "share": 0.6914 }]
```

### GET `/api/stats/campaigns`
```json
[{ "campaignId": "uuid", "campaignName": "9월 무료 PT", "createdAt": "...", "formsCount": 2, "linksCount": 6,
   "VIEW": 1102, "FORM_VIEW": 1024, "FORM_START": 548, "SUBMIT_ATTEMPT": 384, "SUBMIT_SUCCESS": 372, "pageViews": 1500, "conversionRate": 0.3376 }]
```

### GET `/api/stats/links`
링크별. `form: { id, name, slug }` 포함. 필드는 campaigns 와 동일(+`linkId`, `channel`, `code`).

### GET `/api/stats/forms`
폼별 단계 전환율(템플릿 A/B).
```json
[{ "formId": "uuid", "name": "폼 A", "slug": "a", "status": "ACTIVE", "template": { "id": "uuid", "name": "다크" },
   "stages": [ /* funnel.stages 와 같은 형태 */ ], "overallRate": 0.367 }]
```

### GET `/api/stats/heatmap`
```json
{ "grid": [[0, 0, …24개], …7행], "max": 41 }
```
`grid[dow][hour]`, dow 0=일요일, KST.

### GET `/api/stats/failures`
```json
[{ "reason": "network", "status": null, "count": 7 }, { "reason": "http", "status": 400, "count": 4 }]
```

### GET `/api/stats/quality`
```json
{ "submittersOnce": 340, "submittersMulti": 78, "onceRate": 0.8134, "multiRate": 0.1866, "avgVisitsPerSubmitter": 1.3,
  "duplicatePhones": 9, "suspectedBots": 94, "suspectedBotRate": 0.0732 }
```

### GET `/api/stats/insights`
규칙 기반 문장. 링크 클릭 방문자 20명 미만이면 `[]`.
```json
[{ "level": "warn", "text": "작성 시작 단계 이탈 49% 로 가장 큼 — 첫 화면에 입력칸이 보이는지, 카피·디자인 점검" }]
```

### GET `/api/stats/visitors`
단계까지 도달한 방문자 목록 + 여정. 추가 파라미터: `stage`(`FORM_VIEW`|`FORM_START`|`SUBMIT_ATTEMPT`, 기본 `FORM_START`), `submitted`(`true`|`false`, 기본 `false` = 미신청·리마케팅 후보), `page`, `pageSize`(≤100).
```json
{ "total": 1, "page": 1, "pageSize": 20,
  "items": [{ "visitorId": "uuid", "formId": "uuid", "firstSeen": "...", "lastSeen": "...", "views": 3, "lastChannel": "X", "lastStage": "FORM_START",
              "journey": [{ "id": "uuid", "type": "VIEW", "meta": null, "createdAt": "...", "link": { "id": "uuid", "channel": "X", "code": "…" } }] }] }
```

---

## 8. 공개 폼 (`apps/forms`, 인증 없음)

### GET `/l/:code`
채널 배포 링크. 방문 기록 → `gu_vid` 쿠키 발급(없을 때) → 템플릿 HTML 에 제출 스크립트 주입 후 `text/html` 응답.

응답 헤더
```
Content-Security-Policy: default-src 'none'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; img-src 'self' https: data:; media-src 'self' https: data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'
X-Frame-Options: DENY
Cache-Control: no-store
Set-Cookie: gu_vid=<uuid>; HttpOnly; SameSite=Lax; Max-Age=31536000
```
- 404 코드 없음 · 403 폼 `PAUSED` (둘 다 방문 기록 안 함)

### GET `/f/:slug`
채널 없는 직접 접근. 동작 동일, `linkId = null` 로 기록.

### POST `/f/:slug/submissions`
주입 스크립트가 호출. 페이지의 첫 `<form>` 필드를 JSON 으로 전송.
```json
{ "linkCode": "htuqbxbe", "fields": { "name": "홍길동", "phone": "010-1234-5678", "tags": ["a", "b"] } }
```
- `linkCode` 선택. 이 폼에 속한 코드일 때만 채널 귀속, 아니면 무시.
- `fields`: 1~50개, 값은 string 또는 string[], 각 2000자로 절단.
- → 201 `{ "id": "uuid", "createdAt": "..." }`
- 400 필드 비었거나 형식 오류 · 403 `PAUSED` · 404 폼 없음 · 429 분당 20회 초과

### POST `/f/:slug/events`
주입 스크립트가 `navigator.sendBeacon` 으로 호출. 방문자 쿠키(`gu_vid`) 없으면 204 로 받되 기록하지 않음.
```json
{ "linkCode": "htuqbxbe", "type": "form_start", "meta": { "field": "phone" } }
```
- `type`: `form_view` | `form_start` | `submit_attempt` | `submit_error` (서버 전용 `view`/`submit_success` 는 400)
- `meta`: 객체, JSON 1KB 이하. `form_view {hasForm, fields}`, `form_start {field}`, `submit_attempt {fields}`, `submit_error {reason: "http"|"network", status?}`
- → 204 · 400 검증 실패 · 403 `PAUSED` · 404 폼 없음 · 429 분당 120회 초과

### GET `/healthz` → `{ "ok": true }`
