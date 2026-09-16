import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';

/** 이 시간 안에 응답이 오면 로딩 표시를 하지 않는다 (필터 전환이 깜빡이지 않도록) */
const PENDING_DELAY_MS = 150;

export interface ApiState<T> {
  data: T | null;
  /** 요청 진행 중 */
  loading: boolean;
  /** 진행이 길어져 사용자에게 알려야 하는 상태 */
  pending: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * GET 한 번을 상태로. path 가 null 이면 요청하지 않는다(선행 데이터 대기).
 * path 가 바뀌면 다시 요청하되 **이전 데이터를 지우지 않는다** — 새 값이 오기 전까지 이전 화면을 유지하고
 * (stale-while-revalidate) 길어질 때만 pending 으로 흐리게 표시한다. 늦게 도착한 이전 응답은 버린다.
 *
 * initial 은 서버 컴포넌트가 미리 받아둔 값(serverGet). 주어지면 그 값으로 시작하고 첫 요청을 건너뛴다.
 */
export function useApi<T>(path: string | null, initial?: T | null): ApiState<T> {
  const [data, setData] = useState<T | null>(initial ?? null);
  const [loading, setLoading] = useState(!!path && initial == null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  // 서버가 준 첫 데이터는 방금 받아온 것이라 마운트 직후 한 번은 다시 부르지 않는다
  const prefetched = useRef(initial != null);

  useEffect(() => {
    if (!path) { setData(null); setLoading(false); return; }
    if (prefetched.current) { prefetched.current = false; return; }
    const mine = ++seq.current;
    setLoading(true); setError(null);
    api.get<T>(path)
      .then((d) => { if (mine === seq.current) setData(d); })
      .catch((e) => { if (mine === seq.current) setError(e instanceof ApiError ? e.message : '불러오지 못했습니다.'); })
      .finally(() => { if (mine === seq.current) setLoading(false); });
  }, [path, tick]);

  // 짧은 요청은 아무 표시도 하지 않는다
  useEffect(() => {
    if (!loading) { setPending(false); return; }
    const t = setTimeout(() => setPending(true), PENDING_DELAY_MS);
    return () => clearTimeout(t);
  }, [loading]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, pending, error, reload };
}

/** 폼 제출·삭제 같은 쓰기 동작: 진행 중/에러 상태를 함께 관리 */
export function useAction<A extends unknown[]>(fn: (...args: A) => Promise<void>, fallback = '실패했습니다.') {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (...args: A) => {
    setBusy(true); setError(null);
    try { await fn(...args); }
    catch (e) { setError(e instanceof Error && e.message ? e.message : fallback); }
    finally { setBusy(false); }
  }, [fn, fallback]);
  return { run, busy, error };
}
