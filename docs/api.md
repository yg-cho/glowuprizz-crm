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

## 7. 성과 `/api/stats`

정의(ADR-0005): 방문 = 페이지뷰, 방문자 = 고유 `gu_vid` 쿠키, 전환율 = 신청 ÷ 방문자 (방문자 0 → 0).

### GET `/api/stats/overview`
```json
{ "visits": 5, "visitors": 4, "submissions": 2, "campaigns": 1, "forms": 1, "conversionRate": 0.5 }
```
### GET `/api/stats/campaigns`
```json
[{ "campaignId": "uuid", "campaignName": "9월 무료 PT", "visits": 5, "visitors": 4, "submissions": 2, "conversionRate": 0.5 }]
```
### GET `/api/stats/channels?campaignId=`
항상 4채널 모두 반환. 직접 유입(`/f/:slug`) 은 제외.
```json
[{ "channel": "INSTAGRAM", "visits": 3, "visitors": 2, "submissions": 1, "conversionRate": 0.5 }, ...]
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

### GET `/healthz` → `{ "ok": true }`
