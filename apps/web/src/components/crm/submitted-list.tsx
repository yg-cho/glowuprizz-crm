'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Channel } from '@glowuprizz/shared';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChannelBadge } from '@/components/channel-badge';
import { JourneyTimeline } from '@/components/stats/journey-timeline';
import { Pager } from './pager';
import { useApi } from '@/lib/use-api';
import { api, Journey, Submission } from '@/lib/api';
import { duration, fmtDate, fmtNum } from '@/lib/format';

interface Props {
  campaignId?: string;
  formId?: string;
  channel?: Channel;
  pageSize?: number;
  /** 캠페인/폼 열 숨김 (폼 상세처럼 문맥이 정해진 곳) */
  compact?: boolean;
}

/** 신청 완료 명단. 행을 펼치면 방문자 여정을 불러온다. 필터는 전부 서버에서. */
export function SubmittedList({ campaignId, formId, channel, pageSize = 20, compact }: Props) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [journeys, setJourneys] = useState<Record<string, Journey>>({});

  const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (campaignId) q.set('campaignId', campaignId);
  if (formId) q.set('formId', formId);
  if (channel) q.set('channel', channel);
  const { data } = useApi<{ total: number; items: Submission[] }>(`/submissions?${q}`);

  const toggle = (s: Submission) => {
    if (open === s.id) return setOpen(null);
    setOpen(s.id);
    if (!journeys[s.id]) api.get<Journey>(`/submissions/${s.id}/journey`).then((j) => setJourneys((prev) => ({ ...prev, [s.id]: j })));
  };

  const items = data?.items ?? [];
  const cols = compact ? 4 : 5;
  return (
    <>
      <div className="mb-3 text-sm text-muted-foreground">총 {fmtNum(data?.total ?? 0)}건</div>
      <Table>
        <TableHeader>
          <TableRow><TableHead className="w-6" /><TableHead>일시</TableHead>{!compact && <TableHead>캠페인 / 폼</TableHead>}<TableHead>채널</TableHead><TableHead>내용</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && <TableRow><TableCell colSpan={cols} className="py-8 text-center text-muted-foreground">신청이 없습니다.</TableCell></TableRow>}
          {items.map((s) => (
            <Fragment key={s.id}>
              <TableRow className="cursor-pointer" onClick={() => toggle(s)} aria-expanded={open === s.id}>
                <TableCell className="text-muted-foreground">{open === s.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(s.createdAt)}</TableCell>
                {!compact && (
                  <TableCell>
                    <div className="text-xs text-muted-foreground">{s.form.campaign.name}</div>
                    <Link href={`/forms/${s.form.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>{s.form.name}</Link>
                  </TableCell>
                )}
                <TableCell>{s.link ? <ChannelBadge channel={s.link.channel} /> : <span className="text-xs text-muted-foreground">직접</span>}</TableCell>
                <TableCell>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    {Object.entries(s.payload).map(([k, v]) => <Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd className="max-w-md truncate">{Array.isArray(v) ? v.join(', ') : v}</dd></Fragment>)}
                  </dl>
                </TableCell>
              </TableRow>
              {open === s.id && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={cols} className="bg-muted/40 px-6 py-3">
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
      <Pager page={page} total={data?.total ?? 0} pageSize={pageSize} onChange={setPage} />
    </>
  );
}
