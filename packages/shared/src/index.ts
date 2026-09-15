export const CHANNELS = ['INSTAGRAM', 'X', 'YOUTUBE', 'THREADS'] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  INSTAGRAM: '인스타그램',
  X: 'X',
  YOUTUBE: '유튜브',
  THREADS: '스레드',
};

export const VISITOR_COOKIE = 'gu_vid';
export const AUTH_COOKIE = 'gu_admin';

/** 업로드 HTML 최대 크기 (bytes) */
export const MAX_HTML_BYTES = 512 * 1024;

export interface CampaignStats {
  campaignId: string;
  campaignName: string;
  visits: number;
  visitors: number;
  submissions: number;
  /** submissions / visitors, 0~1. visitors 0이면 0 */
  conversionRate: number;
}

export interface ChannelStats {
  channel: Channel;
  visits: number;
  visitors: number;
  submissions: number;
  conversionRate: number;
}

/**
 * 요청이 HTTPS 로 들어왔는지 (리버스 프록시 뒤 포함). Secure 쿠키 플래그 결정에 사용.
 * (이 패키지는 빌드 없이 TS 소스로 참조되므로 단일 파일 유지 — 상대 import 금지)
 */
export function isSecureRequest(req: { secure?: boolean; headers: Record<string, unknown> }): boolean {
  if (req.secure) return true;
  const proto = req.headers['x-forwarded-proto'];
  return typeof proto === 'string' && proto.split(',')[0].trim() === 'https';
}
