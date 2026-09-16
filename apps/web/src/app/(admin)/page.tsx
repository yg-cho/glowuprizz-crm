import { serverGet } from '@/lib/api-server';
import { buildStatsQuery, parseStatsFilters, toParams } from '@/lib/stats-query';
import type { Campaign, CampaignStats, ChannelStats, Failure, Funnel, Insight, TimeseriesPoint } from '@/lib/api';
import { DashboardView } from './view';

/**
 * 대시보드가 쓰는 7개 조회를 서버에서 한 번에 받는다(브라우저에서 순차로 붙는 대신 API 와 같은 망에서 병렬).
 * 필터는 URL 쿼리에 있으므로 클라이언트와 같은 규칙(parse/build)으로 같은 경로를 만들어야 첫 요청이 중복되지 않는다.
 */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseStatsFilters(toParams(await searchParams), { range: '7d', compare: true });
  const q = buildStatsQuery(filters);
  const [campaignList, funnel, series, channels, campaigns, failures, insights] = await Promise.all([
    serverGet<Campaign[]>('/campaigns'),
    serverGet<Funnel>(`/stats/funnel?${q}`),
    serverGet<TimeseriesPoint[]>(`/stats/timeseries?${q}`),
    serverGet<ChannelStats[]>(`/stats/channels?${q}`),
    serverGet<CampaignStats[]>(`/stats/campaigns?${q}`),
    serverGet<Failure[]>(`/stats/failures?${q}`),
    serverGet<Insight[]>(`/stats/insights?${q}`),
  ]);
  return <DashboardView initial={{ campaignList, funnel, series, channels, campaigns, failures, insights }} />;
}
