import type { Channel } from './api';

// 성과 화면의 필터 규칙. 훅(use client)과 서버 컴포넌트가 같은 규칙을 써야 서버가 미리 받아온 데이터와
// 클라이언트의 첫 요청 경로가 일치한다 — 그래서 훅이 아닌 순수 함수로 따로 둔다.

export const RANGES = [
  { value: 'today', label: '오늘' }, { value: '7d', label: '7일' }, { value: '30d', label: '30일' }, { value: '90d', label: '90일' }, { value: 'all', label: '전체' },
] as const;
export type Range = (typeof RANGES)[number]['value'];

export interface StatsFilters { range: Range; campaignId?: string; formId?: string; channel?: Channel; compare: boolean }

/** URLSearchParams 와 Next 의 ReadonlyURLSearchParams 가 함께 만족하는 최소 형태 */
interface ReadableParams { get(key: string): string | null; has(key: string): boolean }

/** 쿼리스트링 → 필터 */
export function parseStatsFilters(sp: ReadableParams, defaults: Partial<StatsFilters> = {}): StatsFilters {
  return {
    range: (sp.get('range') as Range) || defaults.range || '7d',
    campaignId: sp.get('campaignId') || defaults.campaignId || undefined,
    formId: sp.get('formId') || defaults.formId || undefined,
    channel: (sp.get('channel') as Channel) || defaults.channel || undefined,
    compare: sp.has('compare') ? sp.get('compare') === '1' : !!defaults.compare,
  };
}

/** 필터 → api 쿼리스트링. fixed 는 페이지가 강제하는 값(예: 캠페인 상세의 campaignId). */
export function buildStatsQuery(filters: StatsFilters, fixed: Partial<StatsFilters> = {}, extra: Record<string, string> = {}): string {
  const f = { ...filters, ...fixed };
  const q = new URLSearchParams({ range: f.range, ...extra });
  if (f.campaignId) q.set('campaignId', f.campaignId);
  if (f.formId) q.set('formId', f.formId);
  if (f.channel) q.set('channel', f.channel);
  if (f.compare) q.set('compare', '1');
  return q.toString();
}

/** 서버 컴포넌트가 받는 searchParams 를 URLSearchParams 로 (배열은 첫 값만) */
export function toParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const one = Array.isArray(v) ? v[0] : v;
    if (one !== undefined) q.set(k, one);
  }
  return q;
}
