import { createHmac, timingSafeEqual } from 'crypto';

/**
 * 공개 폼 POST 토큰. 렌더 시점에 (slug, visitorId) 에 바인딩된 HMAC 을 주입 스크립트에 넣고,
 * /f/:slug/submissions · /f/:slug/events 는 같은 값을 요구한다.
 * - 다른 운영자 HTML 이 같은 origin 에서 남의 slug 로 제출하는 것을 막는다 (slug 바인딩)
 * - 쿠키를 임의 UUID 로 바꿔 방문자 수를 위조하는 것을 막는다 (visitorId 바인딩)
 */
export class FormToken {
  constructor(private readonly secret: string) {}

  issue(slug: string, visitorId: string): string {
    return createHmac('sha256', this.secret).update(`${slug}\n${visitorId}`).digest('base64url');
  }

  verify(slug: string, visitorId: string, token: string | undefined): boolean {
    if (!token) return false;
    const expected = Buffer.from(this.issue(slug, visitorId));
    const given = Buffer.from(token);
    return expected.length === given.length && timingSafeEqual(expected, given);
  }
}
