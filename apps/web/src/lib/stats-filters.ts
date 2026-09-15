'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Channel } from './api';

export const RANGES = [
  { value: 'today', label: '오늘' }, { value: '7d', label: '7일' }, { value: '30d', label: '30일' }, { value: '90d', label: '90일' }, { value: 'all', label: '전체' },
] as const;
export type Range = (typeof RANGES)[number]['value'];

export interface StatsFilters { range: Range; campaignId?: string; formId?: string; channel?: Channel; compare: boolean }

/** 성과 화면들이 공유하는 필터. URL 쿼리에 저장해 새로고침·공유·뒤로가기가 동작한다. */
export function useStatsFilters(defaults: Partial<StatsFilters> = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const filters = useMemo<StatsFilters>(() => ({
    range: (sp.get('range') as Range) || defaults.range || '7d',
    campaignId: sp.get('campaignId') || defaults.campaignId || undefined,
    formId: sp.get('formId') || defaults.formId || undefined,
    channel: (sp.get('channel') as Channel) || defaults.channel || undefined,
    compare: sp.has('compare') ? sp.get('compare') === '1' : !!defaults.compare,
  }), [sp, defaults.range, defaults.campaignId, defaults.formId, defaults.channel, defaults.compare]);

  const set = useCallback((patch: Partial<StatsFilters>) => {
    const next = new URLSearchParams(sp.toString());
    const put = (k: string, v: string | undefined) => { if (v === undefined || v === '') next.delete(k); else next.set(k, v); };
    if ('range' in patch) put('range', patch.range);
    if ('campaignId' in patch) put('campaignId', patch.campaignId);
    if ('formId' in patch) put('formId', patch.formId);
    if ('channel' in patch) put('channel', patch.channel);
    if ('compare' in patch) put('compare', patch.compare ? '1' : '0'); // false 도 저장해야 기본값(true)으로 되돌아가지 않음
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [sp, router, pathname]);

  /** api 쿼리스트링. fixed 는 페이지가 강제하는 값(예: 캠페인 상세의 campaignId). */
  const query = useCallback((fixed: Partial<StatsFilters> = {}, extra: Record<string, string> = {}) => {
    const f = { ...filters, ...fixed };
    const q = new URLSearchParams({ range: f.range, ...extra });
    if (f.campaignId) q.set('campaignId', f.campaignId);
    if (f.formId) q.set('formId', f.formId);
    if (f.channel) q.set('channel', f.channel);
    if (f.compare) q.set('compare', '1');
    return q.toString();
  }, [filters]);

  return { filters, set, query };
}
