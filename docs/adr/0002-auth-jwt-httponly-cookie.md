# ADR-0002: 운영자 인증 — 이메일/비밀번호 + JWT httpOnly 쿠키

- 상태: 채택
- 날짜: 2026-09-14

## 맥락
"인증한 운영자만 관리자 기능과 신청자 데이터를 볼 수 있어야 한다." 등록 HTML 이 인증 정보에 접근하지 못해야 한다.

## 결정
- bcrypt 해시 비밀번호. 로그인 성공 시 12시간 JWT 를 `gu_admin` 쿠키로 발급: `HttpOnly; SameSite=Lax; Secure`.
  - `Secure` 는 `NODE_ENV` 가 아니라 **요청 프로토콜**(`req.secure` 또는 `x-forwarded-proto: https`) 로 결정한다. production 이미지를 http 로 띄우는 docker compose 에서 브라우저가 쿠키를 버리는 문제를 피하기 위함. 공개 폼의 `gu_vid` 도 동일 규칙.
- 브라우저 JS 는 토큰을 읽을 수 없다. localStorage/Authorization 헤더 방식은 배제.
- 로그인 실패는 계정 존재 여부와 무관하게 동일한 401 메시지 (계정 열거 방지). 로그인 엔드포인트 rate limit 10회/분.
- 모든 관리자 컨트롤러는 `JwtAuthGuard` 로 보호. 모든 조회/변경 쿼리는 `operatorId` 스코프로 필터해 타 운영자 리소스는 404 (IDOR 방지).
- Next.js 미들웨어의 쿠키 존재 검사는 UX 용 리다이렉트일 뿐, 실제 인가는 api 가 수행.

## 대안
- 서버 세션 테이블: 즉시 무효화가 가능하지만 테이블·정리 로직이 추가된다. 12시간 만료로 충분하다고 판단.
- 운영자 회원가입 API: 과제 범위 밖. 시드 스크립트로 운영자 생성.

## 결과
관리자 API 는 쿠키 없이는 전부 401. 위조 토큰 401. e2e 로 검증.
