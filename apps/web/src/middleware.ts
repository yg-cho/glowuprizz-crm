import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@glowuprizz/shared';

// UX 용 리다이렉트만. 실제 인가는 api 가 JWT 검증으로 수행.
const PUBLIC = ['/login'];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();
  if (!req.cookies.get(AUTH_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// /api 프록시, Next 내부, 확장자 있는 정적 파일은 제외
export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };
