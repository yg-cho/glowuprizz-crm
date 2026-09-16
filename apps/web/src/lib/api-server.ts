import { cookies } from 'next/headers';
import { AUTH_COOKIE } from '@glowuprizz/shared';

// 서버 렌더에서만 쓰는 읽기 전용 API. 브라우저용 api.get 과 달리 /api 프록시를 거치지 않고
// 관리자 API 를 직접 부른다(같은 네트워크 안이라 왕복이 한 번 줄어든다).
const target = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

/**
 * 첫 렌더에 쓸 데이터. 미인증·API 오류·연결 실패는 전부 null 로 돌려주고,
 * 화면은 지금까지처럼 클라이언트에서 다시 불러 로딩·에러를 표시한다(프리페치는 어디까지나 선행 최적화).
 */
export async function serverGet<T>(path: string): Promise<T | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;
  try {
    const res = await fetch(`${target()}/api${path}`, {
      headers: { cookie: `${AUTH_COOKIE}=${token}` },
      cache: 'no-store',
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}
