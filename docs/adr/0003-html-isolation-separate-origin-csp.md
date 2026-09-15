# ADR-0003: 등록 HTML 격리 — 별도 origin 서빙 + CSP, sanitize 하지 않음

- 상태: 채택
- 날짜: 2026-09-14

## 맥락
운영자가 AI 로 만든 임의의 HTML(인라인 JS 포함) 을 그대로 서빙해야 한다. 이 HTML 은 관리자 인증 정보나 관리자 API 에 접근할 수 없어야 한다. 동시에 폼의 JS(유효성 검사, 포맷팅 등) 는 살아 있어야 운영자 가치가 있다.

## 결정
1. **별도 origin**: 공개 폼은 `apps/forms` 가 관리자(web/api) 와 다른 호스트에서 서빙. 브라우저 same-origin policy 로 관리자 쿠키·DOM 접근 불가. 로컬 개발에서는 포트만 다르면 쿠키가 공유되므로 forms 는 `127.0.0.1`, 관리자는 `localhost` 를 사용해 호스트도 분리.
2. **관리자 코드 부재**: forms 프로세스에는 관리자 라우트가 없다. 어떤 요청이 와도 관리자 데이터를 줄 코드가 없다.
3. **CSP** — 목적은 XSS 방지가 아니라 **탈출 방지**:
   - `connect-src 'self'` — fetch/XHR/WebSocket 은 forms origin 만. 관리자 API(다른 origin) 로 요청 자체가 차단된다.
   - `form-action 'self'` — 전통 form POST 도 외부 불가.
   - `frame-ancestors 'none'`, `base-uri 'none'`, `object-src 'none'`.
   - `script-src 'self' 'unsafe-inline' https:` — 운영자 인라인 JS, 인라인 이벤트 핸들러, https CDN(Tailwind 등) 허용. **nonce 를 쓰지 않는다**: CSP 스펙상 nonce/hash 가 있으면 브라우저가 `'unsafe-inline'` 을 무시해 운영자 JS 가 전부 죽는다 (Playwright 로 확인). HTML 은 운영자 본인이 올린 것이므로 자기 페이지 안에서의 JS 실행은 위협 모델이 아니다.
   - 한계: `img-src https:` 를 허용하므로 운영자 HTML 이 이미지 비콘으로 *자기 폼의 방문자 입력* 을 외부로 보내는 것까지는 막지 않는다. 그 데이터의 소유자는 운영자 자신이며, 이 ADR 이 보호하는 대상은 **관리자 인증 정보와 관리자 API** 다.
4. **sanitize 하지 않음**: 원문을 DB 에 그대로 저장·서빙. 스크립트를 제거하면 AI 가 만든 폼의 동작이 깨진다. 격리는 1~3 이 담당.
5. 관리자 화면에서는 HTML 을 **렌더하지 않고 소스만 표시**. iframe 미리보기도 두지 않는다 (frame-ancestors 'none' 과도 일관).
6. 업로드 검증: `.html` 확장자, 512KB 이하, `<form>` 1개 이상.

## 대안
- 같은 origin + iframe sandbox: 공개 URL 로 직접 접근하면 sandbox 가 없다. 서버 측 격리가 필요.
- DOMPurify 로 스크립트 제거: 폼 기능이 사라지고, 우회 가능성이 있다.
- `script-src 'nonce'` 만 허용(인라인 금지): 가장 엄격하지만 운영자 JS 가 전부 죽는다. 요구사항("AI 로 만든 폼을 그대로 등록") 과 충돌.

## 결과
Playwright 테스트로 실제 브라우저에서 (a) 폼 JS 동작 (b) 관리자 API 로의 fetch 가 CSP 에 차단됨 (c) 관리자 쿠키가 forms origin 에 존재하지 않음 을 검증.
