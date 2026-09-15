# ADR-0004: 제출 계약 — 첫 <form> 을 가로채는 스크립트 주입

- 상태: 채택
- 날짜: 2026-09-14

## 맥락
운영자는 개발자 없이 AI 로 HTML 을 만든다. 폼이 우리 서버로 데이터를 보내는 방식을 최대한 요구하지 않아야 한다.

## 결정
- forms 서버가 HTML 을 서빙할 때 `</body>` 직전에 nonce 스크립트를 주입.
- 스크립트는 페이지의 **첫 `<form>`** 의 `submit` 을 가로채 `FormData` → JSON 으로 `POST /f/:slug/submissions` (same-origin). 같은 name 의 다중 값은 배열.
- 성공 시 폼을 감사 메시지(`data-gu-success`) 로 교체, 실패 시 alert 후 버튼 재활성.
- 링크 코드(`linkCode`) 는 서버가 렌더 시점에 스크립트에 박아 넣는다. URL 쿼리를 신뢰하지 않는다.
- 운영자에게 요구하는 것: `<form>` 하나와 `name` 있는 입력. 그 외 자유.

## 대안
- 전통 form POST (`action` 지정): JS 없이 동작하지만 운영자가 action 경로를 알아야 한다.
- JS SDK (`window.LeadForm.submit`): 유연하나 AI 프롬프트에 SDK 사용법을 넣어야 한다.

## 결과
fixtures/sample-form.html 처럼 평범한 HTML 이 그대로 동작. e2e 와 Playwright 로 검증.
