import { NextRequest, NextResponse } from 'next/server';

// UX 용 리다이렉트만. 실제 인가는 api 가 JWT 검증으로 수행.
const PUBLIC = ['/login'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || PUBLIC.includes(pathname)) {
    return NextResponse.next();
  }
  if (!req.cookies.get('gu_admin')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!favicon.ico).*)'] };
