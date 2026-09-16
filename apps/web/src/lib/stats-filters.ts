import { useCallback, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { buildStatsQuery, parseStatsFilters, type StatsFilters } from './stats-query';

export { RANGES, type Range, type StatsFilters } from './stats-query';

/** 성과 화면들이 공유하는 필터. URL 쿼리에 저장해 새로고침·공유·뒤로가기가 동작한다. */
export function useStatsFilters(defaults: Partial<StatsFilters> = {}) {
  const { range, campaignId, formId, channel, compare } = defaults;
  const pathname = usePathname();
  const sp = useSearchParams();

  const filters = useMemo<StatsFilters>(
    () => parseStatsFilters(sp, { range, campaignId, formId, channel, compare }),
    [sp, range, campaignId, formId, channel, compare],
  );

  const set = useCallback((patch: Partial<StatsFilters>) => {
    const next = new URLSearchParams(sp.toString());
    const put = (k: string, v: string | undefined) => { if (v === undefined || v === '') next.delete(k); else next.set(k, v); };
    if ('range' in patch) put('range', patch.range);
    if ('campaignId' in patch) put('campaignId', patch.campaignId);
    if ('formId' in patch) put('formId', patch.formId);
    if ('channel' in patch) put('channel', patch.channel);
    if ('compare' in patch) put('compare', patch.compare ? '1' : '0'); // false 도 저장해야 기본값(true)으로 되돌아가지 않음
    // 성과 화면은 전부 클라이언트 렌더인데 router.replace 는 필터를 바꿀 때마다 같은 경로의 RSC 페이로드를
    // 다시 받아온다(서버 왕복 1회 + 라우터 캐시 무효화). 네이티브 History API 는 Next 라우터가 가로채
    // usePathname·useSearchParams 만 갱신하므로 서버 왕복 없이 URL 만 바뀐다.
    const qs = next.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [sp, pathname]);

  /** api 쿼리스트링. fixed 는 페이지가 강제하는 값(예: 캠페인 상세의 campaignId). */
  const query = useCallback(
    (fixed: Partial<StatsFilters> = {}, extra: Record<string, string> = {}) => buildStatsQuery(filters, fixed, extra),
    [filters],
  );

  return { filters, set, query };
}
