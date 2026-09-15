// 이 패키지는 빌드 없이 TS 소스로 참조된다(Node 22 type stripping, Next transpilePackages). 단일 파일 유지 — 상대 import 금지.

// ---------------------------------------------------------------- 채널
export const CHANNELS = ['INSTAGRAM', 'X', 'YOUTUBE', 'THREADS'] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  INSTAGRAM: '인스타그램',
  X: 'X',
  YOUTUBE: '유튜브',
  THREADS: '스레드',
};
/** 셀렉트 박스용 */
export const CHANNEL_OPTIONS = CHANNELS.map((value) => ({ value, label: CHANNEL_LABELS[value] }));

// ---------------------------------------------------------------- 퍼널 이벤트 / 단계 (ADR-0007)
/** DB enum EventType 과 1:1 */
export const EVENT_TYPES = ['VIEW', 'FORM_VIEW', 'FORM_START', 'SUBMIT_ATTEMPT', 'SUBMIT_ERROR', 'SUBMIT_SUCCESS'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** 퍼널 단계 순서 (SUBMIT_ERROR 는 단계가 아님) */
export const STAGES = ['VIEW', 'FORM_VIEW', 'FORM_START', 'SUBMIT_ATTEMPT', 'SUBMIT_SUCCESS'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  VIEW: '링크 클릭',
  FORM_VIEW: '폼 도달',
  FORM_START: '작성 시작',
  SUBMIT_ATTEMPT: '제출 시도',
  SUBMIT_SUCCESS: '신청 완료',
};
export const EVENT_LABELS: Record<EventType, string> = { ...STAGE_LABELS, SUBMIT_ERROR: '제출 실패' };

/** 동시각 이벤트 정렬용 순위 (비콘이 제출 응답 뒤에 도착할 수 있음) */
export const EVENT_RANK: Record<EventType, number> = { VIEW: 0, FORM_VIEW: 1, FORM_START: 2, SUBMIT_ATTEMPT: 3, SUBMIT_ERROR: 4, SUBMIT_SUCCESS: 5 };

/** 브라우저(주입 스크립트)가 보낼 수 있는 이벤트. VIEW·SUBMIT_SUCCESS 는 서버 전용. */
export const CLIENT_EVENT_TYPES = ['form_view', 'form_start', 'submit_attempt', 'submit_error'] as const;
export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];
export const CLIENT_EVENT_MAP: Record<ClientEventType, EventType> = {
  form_view: 'FORM_VIEW',
  form_start: 'FORM_START',
  submit_attempt: 'SUBMIT_ATTEMPT',
  submit_error: 'SUBMIT_ERROR',
};

/** 채널·링크 비교에서 '최저' 색 표시를 할 최소 표본(링크 클릭 방문자) */
export const MIN_SAMPLE = 10;

export type StageCounts = Record<Stage, number>;
export interface FunnelStage {
  type: Stage;
  label: string;
  visitors: number;
  /** 직전 단계 대비 */
  stepRate: number;
  /** 첫 단계 대비 */
  cumulativeRate: number;
  dropoff: number;
}

// ---------------------------------------------------------------- 쿠키 / 업로드
export const VISITOR_COOKIE = 'gu_vid';
export const AUTH_COOKIE = 'gu_admin';
/** gu_vid 값 형식 (UUID v4 엄격) */
export const VISITOR_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** 배포 링크 코드: 대소문자 혼동 문자(0/O, 1/l/I) 제외, 8자 */
export const LINK_CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
export const LINK_CODE_LENGTH = 8;
export const LINK_CODE_PATTERN = new RegExp(`^[${LINK_CODE_ALPHABET}]{${LINK_CODE_LENGTH}}$`);

/** 공개 폼 POST 에 요구하는 토큰 헤더. 주입 스크립트가 slug·방문자에 바인딩된 값을 실어 보낸다. */
export const FORM_TOKEN_HEADER = 'x-gu-token';

/** 업로드 HTML 최대 크기 (bytes) */
export const MAX_HTML_BYTES = 512 * 1024;

/**
 * 요청이 HTTPS 로 들어왔는지 (리버스 프록시 뒤 포함). Secure 쿠키 플래그 결정에 사용.
 */
export function isSecureRequest(req: { secure?: boolean; headers: Record<string, unknown> }): boolean {
  if (req.secure) return true;
  const proto = req.headers['x-forwarded-proto'];
  return typeof proto === 'string' && proto.split(',')[0].trim() === 'https';
}

/** httpOnly 쿠키 공통 옵션. Secure 는 요청 프로토콜 기준 (http 로컬/compose 에서도 쿠키 유지). */
export function httpOnlyCookie(req: { secure?: boolean; headers: Record<string, unknown> }, maxAgeMs: number) {
  return { httpOnly: true, sameSite: 'lax' as const, secure: isSecureRequest(req), maxAge: maxAgeMs, path: '/' };
}
