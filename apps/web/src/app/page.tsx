'use client';

import { Suspense, useEffect, useState } from 'react';
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
import { useStatsFilters } from '@/lib/stats-filters';
import { api, Campaign, CampaignStats, ChannelStats, Failure, Funnel, Insight, TimeseriesPoint } from '@/lib/api';
import { pct, fmtNum, fmtDay } from '@/lib/utils';

function Dashboard() {
  const { filters, set, query } = useStatsFilters({ range: '7d', compare: true });
  const [campaignList, setCampaignList] = useState<Campaign[]>([]);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [series, setSeries] = useState<TimeseriesPoint[]>([]);
  const [channels, setChannels] = useState<ChannelStats[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => { api.get<Campaign[]>('/campaigns').then(setCampaignList); }, []);
  useEffect(() => {
    const q = query();
    api.get<Funnel>(`/stats/funnel?${q}`).then(setFunnel);
    api.get<TimeseriesPoint[]>(`/stats/timeseries?${q}`).then(setSeries);
    api.get<ChannelStats[]>(`/stats/channels?${q}`).then(setChannels);
    api.get<CampaignStats[]>(`/stats/campaigns?${q}`).then(setCampaigns);
    api.get<Failure[]>(`/stats/failures?${q}`).then(setFailures);
    api.get<Insight[]>(`/stats/insights?${q}`).then(setInsights);
  }, [query]);

  const failureText = failures.length ? failures.map((f) => `${failureLabel(f.reason)} ${f.count}`).join(', ') : undefined;

  return (
    <>
      <PageTitle title="대시보드" desc="링크 클릭부터 신청 완료까지 다섯 단계. 색은 채널과 최대 이탈 구간에만." />
      <FiltersBar filters={filters} onChange={set} campaigns={campaignList} />

      {funnel && <StageCards funnel={funnel.current} previous={funnel.previous} />}

      <div className="mb-3 grid gap-3 lg:grid-cols-5">
        <Section title="퍼널" desc="고유 방문자 기준. 막대 사이 숫자는 단계 전환율." className="lg:col-span-3">
          {funnel && <FunnelChart funnel={funnel.current} failures={failureText} />}
        </Section>
        <Section title="일별 추이" desc="방문자와 신청. 점선은 전환율(우축)." className="lg:col-span-2">
          {filters.range === 'all' && series.length === 0
            ? <p className="text-xs text-muted-foreground">데이터 없음</p>
            : <TimeseriesChart data={series} />}
        </Section>
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        <Section title="채널 비교" desc="같은 단계를 채널끼리 나란히. 직접 유입은 제외." className="lg:col-span-3">
          <ChannelTable rows={channels} />
        </Section>
        <Section title="캠페인" desc="행을 누르면 캠페인 상세로." className="lg:col-span-2">
          <Table>
            <TableHeader>
              <TableRow><TableHead>캠페인</TableHead><TableHead className="text-right">클릭</TableHead><TableHead className="text-right">신청</TableHead><TableHead className="text-right">전환</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">캠페인이 없습니다. <Link className="underline" href="/campaigns">만들기</Link></TableCell></TableRow>}
              {campaigns.map((c) => (
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
          <Insights items={insights} />
        </Section>
      </div>
    </>
  );
}

const failureLabel = (reason: string) => ({ network: '네트워크', http: '서버 응답', unknown: '기타' })[reason] ?? reason;

export default function DashboardPage() {
  return (
    <Shell>
      <Suspense><Dashboard /></Suspense>
    </Shell>
  );
}
