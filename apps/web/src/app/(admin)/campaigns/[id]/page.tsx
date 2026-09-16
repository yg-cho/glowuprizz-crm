import { serverGet } from '@/lib/api-server';
import { buildStatsQuery, parseStatsFilters, toParams } from '@/lib/stats-query';
import type { Campaign, Failure, FormStats, Funnel, Heatmap, LinkStats, Quality, Template } from '@/lib/api';
import { CampaignDetailView } from './view';

/** 캠페인 상세가 쓰는 조회 8개를 서버에서 병렬로 받아 첫 화면부터 채워 보낸다. */
export default async function CampaignDetailPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const filters = parseStatsFilters(toParams(await searchParams), { range: '7d', compare: true });
  const q = buildStatsQuery(filters, { campaignId: id });
  const [campaign, templates, funnel, links, forms, heatmap, failures, quality, config] = await Promise.all([
    serverGet<Campaign>(`/campaigns/${id}`),
    serverGet<Template[]>('/templates'),
    serverGet<Funnel>(`/stats/funnel?${q}`),
    serverGet<LinkStats[]>(`/stats/links?${q}`),
    serverGet<FormStats[]>(`/stats/forms?${q}`),
    serverGet<Heatmap>(`/stats/heatmap?${q}`),
    serverGet<Failure[]>(`/stats/failures?${q}`),
    serverGet<Quality>(`/stats/quality?${q}`),
    serverGet<{ formsPublicOrigin: string }>('/config'),
  ]);
  return (
    <CampaignDetailView
      id={id}
      initial={{ campaign, templates, funnel, links, forms, heatmap, failures, quality, publicOrigin: config?.formsPublicOrigin ?? null }}
    />
  );
}
