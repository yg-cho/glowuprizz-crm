import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { VISITOR_COOKIE, VISITOR_ID_PATTERN, httpOnlyCookie } from '@glowuprizz/shared';

const VISITOR_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365;

/** 요청에서 방문자 정보 한 묶음 (이벤트·제출 기록에 그대로 넘긴다) */
export interface RequestContext {
  visitorId: string | null;
  ip?: string;
  userAgent?: string;
}

/** 유효한 gu_vid 쿠키 값, 없으면 null */
export function readVisitorId(req: Request): string | null {
  const vid: unknown = req.cookies?.[VISITOR_COOKIE];
  return typeof vid === 'string' && VISITOR_ID_PATTERN.test(vid) ? vid : null;
}

/** 쿠키가 없으면 새 방문자 ID 를 발급해 응답에 심는다 (페이지 렌더 시에만) */
export function ensureVisitorId(req: Request, res: Response): string {
  const existing = readVisitorId(req);
  if (existing) return existing;
  const vid = randomUUID();
  res.cookie(VISITOR_COOKIE, vid, httpOnlyCookie(req, VISITOR_COOKIE_MAX_AGE_MS));
  return vid;
}

export function requestContext(req: Request, visitorId: string | null = readVisitorId(req)): RequestContext {
  return { visitorId, ip: req.ip, userAgent: req.headers['user-agent'] };
}
