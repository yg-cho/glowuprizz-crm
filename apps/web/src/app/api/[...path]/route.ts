import { NextRequest } from 'next/server';

// 브라우저 → 같은 origin /api/* → 관리자 API 서버. 런타임에 env 를 읽어 compose/Railway 어디서든 동작.
// (next.config rewrites 는 빌드 시점에 대상이 고정되어 사용하지 않음)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const target = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

// hop-by-hop / 재계산되는 헤더는 전달하지 않음
const STRIP_REQ = new Set(['host', 'connection', 'content-length', 'accept-encoding']);
const STRIP_RES = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection']);

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = new URL(`${target()}/api/${path.join('/')}`);
  url.search = req.nextUrl.search;

  const headers = new Headers();
  req.headers.forEach((v, k) => { if (!STRIP_REQ.has(k.toLowerCase())) headers.set(k, v); });

  // 바디는 버퍼로 전달 (multipart 포함). 업로드 상한이 512KB 라 메모리 부담 없음.
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body: hasBody ? Buffer.from(await req.arrayBuffer()) : undefined,
    redirect: 'manual',
    cache: 'no-store',
  });

  const resHeaders = new Headers();
  upstream.headers.forEach((v, k) => { if (!STRIP_RES.has(k.toLowerCase())) resHeaders.append(k, v); });
  // Set-Cookie 는 여러 개일 수 있어 개별 전달
  const cookies = (upstream.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  resHeaders.delete('set-cookie');
  for (const c of cookies) resHeaders.append('set-cookie', c);

  return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS };
