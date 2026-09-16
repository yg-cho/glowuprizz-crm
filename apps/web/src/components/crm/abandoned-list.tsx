'use client';

import { useEffect, useState } from 'react';
import { ChannelBadge } from '@/components/channel-badge';
import { JourneyTimeline } from '@/components/stats/journey-timeline';
import { Pager } from './pager';
import { useApi } from '@/lib/use-api';
import type { VisitorRow } from '@/lib/api';
import { fmtDate, fmtNum } from '@/lib/format';

const PAGE = 20;

/** 작성 시작했지만 미신청 방문자(리마케팅 후보). 여정을 바로 펼쳐 보인다. */
export function AbandonedList({ statsQuery }: { statsQuery: string }) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [statsQuery]);
  const { data, pending, error } = useApi<{ total: number; items: VisitorRow[] }>(`/stats/visitors?${statsQuery}&stage=FORM_START&submitted=false&page=${page}&pageSize=${PAGE}`);
  return (
    <>
      <div className="mb-3 text-sm text-muted-foreground">총 {fmtNum(data?.total ?? 0)}명 · 작성은 시작했지만 신청하지 않은 방문자. 개인정보 없음.</div>
      <div className="space-y-2">
        {error && <p className="py-4 text-sm text-destructive">{error}</p>}
        {!error && (data?.items ?? []).length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{pending ? '불러오는 중…' : '해당 방문자가 없습니다.'}</p>}
        {data?.items.map((v) => (
          <div key={v.visitorId} className="rounded-lg border p-3">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span>
                <b className="font-medium">익명 방문자</b> <span className="text-xs text-muted-foreground">{v.visitorId.slice(0, 8)}…</span>
                {v.lastChannel && <span className="ml-2 inline-block align-middle"><ChannelBadge channel={v.lastChannel} /></span>}
              </span>
              <span className="text-xs text-muted-foreground">미신청 · 방문 {v.views}회 · 마지막 {fmtDate(v.lastSeen)}</span>
            </div>
            <JourneyTimeline events={v.journey} />
          </div>
        ))}
      </div>
      <Pager page={page} total={data?.total ?? 0} pageSize={PAGE} onChange={setPage} />
    </>
  );
}
