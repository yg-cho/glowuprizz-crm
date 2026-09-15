'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Shell, PageTitle } from '@/components/shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ChannelBadge } from '@/components/channel-badge';
import { api, CampaignStats, ChannelStats, Overview } from '@/lib/api';
import { pct } from '@/lib/utils';

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);
  const [channels, setChannels] = useState<ChannelStats[]>([]);

  useEffect(() => {
    api.get<Overview>('/stats/overview').then(setOverview);
    api.get<CampaignStats[]>('/stats/campaigns').then(setCampaigns);
    api.get<ChannelStats[]>('/stats/channels').then(setChannels);
  }, []);

  return (
    <Shell>
      <PageTitle title="대시보드" desc="캠페인별 · 채널별 성과" />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="방문" value={overview?.visits ?? '–'} hint="페이지뷰 전체" />
        <Stat label="방문자" value={overview?.visitors ?? '–'} hint="고유 방문자(쿠키)" />
        <Stat label="신청" value={overview?.submissions ?? '–'} hint="CRM 명단 건수" />
        <Stat label="전환율" value={overview ? pct(overview.conversionRate) : '–'} hint="신청 ÷ 방문자" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>캠페인별 성과</CardTitle>
            <CardDescription>전환율 = 신청 ÷ 고유 방문자</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>캠페인</TableHead><TableHead className="text-right">방문</TableHead><TableHead className="text-right">방문자</TableHead><TableHead className="text-right">신청</TableHead><TableHead className="text-right">전환율</TableHead></TableRow></TableHeader>
              <TableBody>
                {campaigns.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-gray-400">캠페인이 없습니다. <Link className="underline" href="/campaigns">만들기</Link></TableCell></TableRow>}
                {campaigns.map((c) => (
                  <TableRow key={c.campaignId}>
                    <TableCell><Link className="font-medium hover:underline" href={`/campaigns/${c.campaignId}`}>{c.campaignName}</Link></TableCell>
                    <TableCell className="text-right tabular-nums">{c.visits}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.visitors}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.submissions}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{pct(c.conversionRate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>채널별 성과</CardTitle>
            <CardDescription>배포 링크 기준 (직접 유입 제외)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channels.map((c) => ({ ...c, name: c.channel }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip />
                  <Bar dataKey="visitors" name="방문자" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="submissions" name="신청" fill="#111827" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Table className="mt-3">
              <TableHeader><TableRow><TableHead>채널</TableHead><TableHead className="text-right">방문</TableHead><TableHead className="text-right">방문자</TableHead><TableHead className="text-right">신청</TableHead><TableHead className="text-right">전환율</TableHead></TableRow></TableHeader>
              <TableBody>
                {channels.map((c) => (
                  <TableRow key={c.channel}>
                    <TableCell><ChannelBadge channel={c.channel} /></TableCell>
                    <TableCell className="text-right tabular-nums">{c.visits}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.visitors}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.submissions}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{pct(c.conversionRate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
