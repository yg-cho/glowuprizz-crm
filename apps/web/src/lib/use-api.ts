import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * GET 한 번을 상태로. path 가 null 이면 요청하지 않는다(선행 데이터 대기).
 * path 가 바뀌면 다시 요청하고, 늦게 도착한 이전 응답은 버린다.
 */
export function useApi<T>(path: string | null): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (!path) { setData(null); setLoading(false); return; }
    const mine = ++seq.current;
    setData(null); // 이전 필터의 수치가 새 라벨 아래 남지 않도록
    setLoading(true); setError(null);
    api.get<T>(path)
      .then((d) => { if (mine === seq.current) setData(d); })
      .catch((e) => { if (mine === seq.current) setError(e instanceof ApiError ? e.message : '불러오지 못했습니다.'); })
      .finally(() => { if (mine === seq.current) setLoading(false); });
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
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
