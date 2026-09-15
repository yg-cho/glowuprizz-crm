'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** 클립보드 복사 + 1.5초 "복사됨" 표시. 실패(비보안 컨텍스트)는 조용히 무시하지 않고 false 반환. */
export function useCopy(resetMs = 1500) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copy = useCallback(async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); }
    catch { return false; }
    setCopied(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), resetMs);
    return true;
  }, [resetMs]);
  return { copied, copy };
}
