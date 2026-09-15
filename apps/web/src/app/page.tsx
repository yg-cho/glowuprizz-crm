'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Shell, PageTitle } from '@/components/shell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FiltersBar } from '@/components/stats/filters-bar';
import { StageCards } from '@/components/stats/stage-cards';
import { FunnelChart } from '@/components/stats/funnel-chart';
import { TimeseriesChart } from '@/components/stats/timeseries-chart';
import { ChannelTable } from '@/components/stats/channel-table';
import { ShareBar } from '@/components/stats/share-bar';
import { Insights } from '@/components/stats/insights';
import { Section } from '@/components/stats/section';
import { EmptyRow } from '@/components/empty-row';
import { ErrorText } from '@/components/error-text';
import { useStatsFilters } from '@/lib/stats-filters';
import { useApi } from '@/lib/use-api';
import type { Campaign, CampaignStats, ChannelStats, Failure, Funnel, Insight, TimeseriesPoint } from '@/lib/api';
import { pct, fmtNum, fmtDay, failureShort } from '@/lib/format';

function Dashboard() {
  const { filters, set, query } = useStatsFilters({ range: '7d', compare: true });
  const q = query();
  const { data: campaignList } = useApi<Campaign[]>('/campaigns');
  const funnelQ = useApi<Funnel>(`/stats/funnel?${q}`);
  const seriesQ = useApi<TimeseriesPoint[]>(`/stats/timeseries?${q}`);
  const channelsQ = useApi<ChannelStats[]>(`/stats/channels?${q}`);
  const campaignsQ = useApi<CampaignStats[]>(`/stats/campaigns?${q}`);
  const { data: failures } = useApi<Failure[]>(`/stats/failures?${q}`);
  const { data: insights } = useApi<Insight[]>(`/stats/insights?${q}`);
  const funnel = funnelQ.data, series = seriesQ.data, channels = channelsQ.data, campaigns = campaignsQ.data;

  const failureText = failures?.length ? failures.map((f) => `${failureShort(f.reason)} ${f.count}`).join(', ') : undefined;

  return (
    <>
      <PageTitle title="대시보드" desc="링크 클릭부터 신청 완료까지 다섯 단계. 색은 채널과 최대 이탈 구간에만." />
      <FiltersBar filters={filters} onChange={set} campaigns={campaignList ?? []} />

      {funnelQ.error && <ErrorText>{funnelQ.error}</ErrorText>}
      {funnel && <StageCards funnel={funnel.current} previous={funnel.previous} />}

      <div className="mb-3 grid gap-3 lg:grid-cols-5">
        <Section title="퍼널" desc="고유 방문자 기준. 막대 사이 숫자는 단계 전환율." className="lg:col-span-3" state={funnelQ}>
          {funnel && <FunnelChart funnel={funnel.current} failures={failureText} />}
        </Section>
        <Section title="일별 추이" desc="방문자와 신청. 점선은 전환율(우축)." className="lg:col-span-2" state={seriesQ}>
          {series && (series.length === 0 ? <p className="text-xs text-muted-foreground">데이터 없음</p> : <TimeseriesChart data={series} />)}
        </Section>
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        <Section title="채널 비교" desc="같은 단계를 채널끼리 나란히. 직접 유입은 제외." className="lg:col-span-3" state={channelsQ}>
          <ChannelTable rows={channels} />
        </Section>
        <Section title="캠페인" desc="행을 누르면 캠페인 상세로." className="lg:col-span-2" state={campaignsQ}>
          <Table>
            <TableHeader>
              <TableRow><TableHead>캠페인</TableHead><TableHead className="text-right">클릭</TableHead><TableHead className="text-right">신청</TableHead><TableHead className="text-right">전환</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {(campaigns ?? []).length === 0 && <EmptyRow colSpan={5} loading={campaigns === null}>캠페인이 없습니다. <Link className="underline" href="/campaigns">만들기</Link></EmptyRow>}
              {campaigns?.map((c) => (
                <TableRow key={c.campaignId}>
                  <TableCell>
                    <Link href={`/campaigns/${c.campaignId}?range=${filters.range}`} className="font-medium hover:underline">{c.campaignName}</Link>
                    <div className="text-xs text-muted-foreground">폼 {c.formsCount} · 링크 {c.linksCount} · {fmtDay(c.createdAt)} 시작</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(c.VIEW)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(c.SUBMIT_SUCCESS)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(c.conversionRate)}</TableCell>
                  <TableCell><ShareBar value={c.conversionRate} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Insights items={insights ?? []} />
        </Section>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Shell>
      <Suspense><Dashboard /></Suspense>
    </Shell>
  );
}
