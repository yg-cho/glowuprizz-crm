'use client';

import { Fragment, Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Shell, PageTitle } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChannelBadge } from '@/components/channel-badge';
import { FiltersBar } from '@/components/stats/filters-bar';
import { JourneyTimeline } from '@/components/stats/journey-timeline';
import { useStatsFilters } from '@/lib/stats-filters';
import { api, Campaign, Journey, Submission, VisitorRow } from '@/lib/api';
import { fmtDate, fmtNum } from '@/lib/utils';

const PAGE = 20;
type Mode = 'submitted' | 'abandoned';

function SubmissionsView() {
  const { filters, set, query } = useStatsFilters({ range: 'all' });
  const [mode, setMode] = useState<Mode>('submitted');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [page, setPage] = useState(1);
  useEffect(() => { api.get<Campaign[]>('/campaigns').then(setCampaigns); }, []);
  useEffect(() => { setPage(1); }, [mode, filters]);

  return (
    <>
      <PageTitle title="CRM 명단" desc="신청자 한 명이 어느 채널로 몇 번 들어와 언제 썼는지. '작성만 하고 미신청'은 리마케팅 후보(방문자 쿠키 기준)." />
      <FiltersBar
        filters={filters} onChange={set} campaigns={campaigns}
        right={
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList aria-label="상태"><TabsTrigger value="submitted">신청 완료</TabsTrigger><TabsTrigger value="abandoned">작성만 하고 미신청</TabsTrigger></TabsList>
          </Tabs>
        }
      />
      <Card>
        <CardContent className="p-5">
          {mode === 'submitted'
            ? <SubmittedList campaignId={filters.campaignId} channel={filters.channel} page={page} setPage={setPage} />
            : <AbandonedList query={query} page={page} setPage={setPage} />}
        </CardContent>
      </Card>
    </>
  );
}

/** 신청 완료 명단. 행 펼치면 여정 로드. */
function SubmittedList({ campaignId, channel, page, setPage }: { campaignId?: string; channel?: string; page: number; setPage: (n: number) => void }) {
  const [data, setData] = useState<{ total: number; items: Submission[] } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [journeys, setJourneys] = useState<Record<string, Journey>>({});

  const load = useCallback(() => {
    const q = new URLSearchParams({ page: String(page), pageSize: String(PAGE) });
    if (campaignId) q.set('campaignId', campaignId);
    api.get<{ total: number; items: Submission[] }>(`/submissions?${q}`).then(setData);
  }, [page, campaignId]);
  useEffect(() => { load(); }, [load]);

  const toggle = (s: Submission) => {
    if (open === s.id) return setOpen(null);
    setOpen(s.id);
    if (!journeys[s.id]) api.get<Journey>(`/submissions/${s.id}/journey`).then((j) => setJourneys((prev) => ({ ...prev, [s.id]: j })));
  };

  // 채널 필터는 클라이언트에서 (명단 API 는 채널 파라미터 없음)
  const items = (data?.items ?? []).filter((s) => !channel || s.link?.channel === channel);
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE));

  return (
    <>
      <div className="mb-3 text-sm text-muted-foreground">총 {fmtNum(data?.total ?? 0)}건{channel && ' · 채널 필터는 현재 페이지에만 적용'}</div>
      <Table>
        <TableHeader><TableRow><TableHead className="w-6" /><TableHead>일시</TableHead><TableHead>캠페인 / 폼</TableHead><TableHead>채널</TableHead><TableHead>내용</TableHead></TableRow></TableHeader>
        <TableBody>
          {items.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">신청이 없습니다.</TableCell></TableRow>}
          {items.map((s) => (
            <Fragment key={s.id}>
              <TableRow className="cursor-pointer" onClick={() => toggle(s)} aria-expanded={open === s.id}>
                <TableCell className="text-muted-foreground">{open === s.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(s.createdAt)}</TableCell>
                <TableCell><div className="text-xs text-muted-foreground">{s.form.campaign.name}</div><Link href={`/forms/${s.form.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>{s.form.name}</Link></TableCell>
                <TableCell>{s.link ? <ChannelBadge channel={s.link.channel} /> : <span className="text-xs text-muted-foreground">직접</span>}</TableCell>
                <TableCell>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    {Object.entries(s.payload).map(([k, v]) => <Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd className="max-w-md truncate">{Array.isArray(v) ? v.join(', ') : v}</dd></Fragment>)}
                  </dl>
                </TableCell>
              </TableRow>
              {open === s.id && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="bg-muted/40 px-6 py-3">
                    {journeys[s.id]
                      ? <>
                          <div className="mb-2 text-xs text-muted-foreground">방문 {journeys[s.id].visits}회 · 첫 방문에서 신청까지 {duration(journeys[s.id].secondsToSubmit)}</div>
                          <JourneyTimeline events={journeys[s.id].events} />
                        </>
                      : <div className="text-xs text-muted-foreground">불러오는 중…</div>}
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
      <Pager page={page} pages={pages} setPage={setPage} />
    </>
  );
}

/** 작성 시작했지만 미신청 방문자. 여정을 바로 펼쳐 보인다. */
function AbandonedList({ query, page, setPage }: { query: ReturnType<typeof useStatsFilters>['query']; page: number; setPage: (n: number) => void }) {
  const [data, setData] = useState<{ total: number; items: VisitorRow[] } | null>(null);
  useEffect(() => {
    api.get<{ total: number; items: VisitorRow[] }>(`/stats/visitors?${query({}, { stage: 'FORM_START', submitted: 'false', page: String(page), pageSize: String(PAGE) })}`).then(setData);
  }, [query, page]);
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE));
  return (
    <>
      <div className="mb-3 text-sm text-muted-foreground">총 {fmtNum(data?.total ?? 0)}명 · 작성은 시작했지만 신청하지 않은 방문자. 개인정보 없음.</div>
      <div className="space-y-2">
        {(data?.items ?? []).length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">해당 방문자가 없습니다.</p>}
        {data?.items.map((v) => (
          <div key={v.visitorId} className="rounded-lg border p-3">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span><b className="font-medium">익명 방문자</b> <span className="text-xs text-muted-foreground">{v.visitorId.slice(0, 8)}…</span> {v.lastChannel && <span className="ml-2 inline-block align-middle"><ChannelBadge channel={v.lastChannel} /></span>}</span>
              <span className="text-xs text-muted-foreground">미신청 · 방문 {v.views}회 · 마지막 {fmtDate(v.lastSeen)}</span>
            </div>
            <JourneyTimeline events={v.journey} />
          </div>
        ))}
      </div>
      <Pager page={page} pages={pages} setPage={setPage} />
    </>
  );
}

function Pager({ page, pages, setPage }: { page: number; pages: number; setPage: (n: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>이전</Button>
      <span className="text-muted-foreground">{page} / {pages}</span>
      <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>다음</Button>
    </div>
  );
}

const duration = (sec: number) => sec < 60 ? `${sec}초` : sec < 3600 ? `${Math.round(sec / 60)}분` : `${Math.floor(sec / 3600)}시간 ${Math.round((sec % 3600) / 60)}분`;

export default function SubmissionsPage() {
  return (
    <Shell>
      <Suspense><SubmissionsView /></Suspense>
    </Shell>
  );
}
