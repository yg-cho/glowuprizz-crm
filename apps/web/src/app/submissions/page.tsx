'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Shell, PageTitle } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ChannelBadge } from '@/components/channel-badge';
import { api, Campaign, Submission } from '@/lib/api';
import { fmtDate } from '@/lib/utils';

const PAGE = 25;

export default function SubmissionsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: Submission[] } | null>(null);

  useEffect(() => { api.get<Campaign[]>('/campaigns').then(setCampaigns); }, []);
  const load = useCallback(() => {
    const q = new URLSearchParams({ page: String(page), pageSize: String(PAGE) });
    if (campaignId) q.set('campaignId', campaignId);
    api.get<{ total: number; items: Submission[] }>(`/submissions?${q}`).then(setData);
  }, [page, campaignId]);
  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE));

  return (
    <Shell>
      <PageTitle title="CRM 명단" desc="공개 폼으로 들어온 신청 데이터 전체" />
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-end gap-3">
            <div className="w-64">
              <Label htmlFor="filter-campaign">캠페인</Label>
              <Select value={campaignId || 'all'} onValueChange={(v) => { setCampaignId(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger id="filter-campaign"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-500 pb-2.5">총 {data?.total ?? 0}건</div>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>일시</TableHead><TableHead>캠페인 / 폼</TableHead><TableHead>채널</TableHead><TableHead>내용</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.items ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-gray-400">신청이 없습니다.</TableCell></TableRow>}
              {data?.items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-gray-500 whitespace-nowrap">{fmtDate(s.createdAt)}</TableCell>
                  <TableCell><div className="text-xs text-gray-500">{s.form.campaign.name}</div><Link href={`/forms/${s.form.id}`} className="font-medium hover:underline">{s.form.name}</Link></TableCell>
                  <TableCell>{s.link ? <ChannelBadge channel={s.link.channel} /> : <span className="text-xs text-gray-400">직접</span>}</TableCell>
                  <TableCell>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                      {Object.entries(s.payload).map(([k, v]) => (<><dt key={k + 'k'} className="text-gray-500">{k}</dt><dd key={k + 'v'} className="truncate max-w-md">{Array.isArray(v) ? v.join(', ') : v}</dd></>))}
                    </dl>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-end gap-2 text-sm">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>이전</Button>
            <span className="text-gray-500">{page} / {pages}</span>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>다음</Button>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
