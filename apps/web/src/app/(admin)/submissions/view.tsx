'use client';

import { useState } from 'react';
import { PageTitle } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FiltersBar } from '@/components/stats/filters-bar';
import { SubmittedList } from '@/components/crm/submitted-list';
import type { SubmissionPage } from '@/lib/submissions-query';
import { AbandonedList } from '@/components/crm/abandoned-list';
import { useStatsFilters } from '@/lib/stats-filters';
import { useApi } from '@/lib/use-api';
import type { Campaign } from '@/lib/api';

type Mode = 'submitted' | 'abandoned';

interface Props {
  initialCampaigns: Campaign[] | null;
  initialSubmissions: SubmissionPage | null;
}

export function SubmissionsView({ initialCampaigns, initialSubmissions }: Props) {
  const { filters, set, query } = useStatsFilters({ range: 'all' });
  const [mode, setMode] = useState<Mode>('submitted');
  const { data: campaigns } = useApi<Campaign[]>('/campaigns', initialCampaigns);
  // 탭을 옮겼다 오면 명단이 새로 마운트된다 — 그때는 서버가 준 값이 낡았으니 다시 불러온다
  const [switched, setSwitched] = useState(false);
  const changeMode = (v: Mode) => { setSwitched(true); setMode(v); };

  return (
    <>
      <PageTitle title="CRM 명단" desc="신청자 한 명이 어느 채널로 몇 번 들어와 언제 썼는지. '작성만 하고 미신청'은 리마케팅 후보(방문자 쿠키 기준)." />
      <FiltersBar
        filters={filters} onChange={set} campaigns={campaigns ?? []} hideRange={mode === 'submitted'}
        right={
          <Tabs value={mode} onValueChange={(v) => changeMode(v as Mode)}>
            <TabsList aria-label="상태"><TabsTrigger value="submitted">신청 완료</TabsTrigger><TabsTrigger value="abandoned">작성만 하고 미신청</TabsTrigger></TabsList>
          </Tabs>
        }
      />
      <Card>
        <CardContent className="p-5">
          {mode === 'submitted'
            ? <SubmittedList campaignId={filters.campaignId} formId={filters.formId} channel={filters.channel} initial={switched ? null : initialSubmissions} />
            : <AbandonedList statsQuery={query()} />}
        </CardContent>
      </Card>
    </>
  );
}
