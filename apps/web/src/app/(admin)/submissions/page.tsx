'use client';

import { useState } from 'react';
import { PageTitle } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FiltersBar } from '@/components/stats/filters-bar';
import { SubmittedList } from '@/components/crm/submitted-list';
import { AbandonedList } from '@/components/crm/abandoned-list';
import { useStatsFilters } from '@/lib/stats-filters';
import { useApi } from '@/lib/use-api';
import type { Campaign } from '@/lib/api';

type Mode = 'submitted' | 'abandoned';

export default function SubmissionsView() {
  const { filters, set, query } = useStatsFilters({ range: 'all' });
  const [mode, setMode] = useState<Mode>('submitted');
  const { data: campaigns } = useApi<Campaign[]>('/campaigns');

  return (
    <>
      <PageTitle title="CRM 명단" desc="신청자 한 명이 어느 채널로 몇 번 들어와 언제 썼는지. '작성만 하고 미신청'은 리마케팅 후보(방문자 쿠키 기준)." />
      <FiltersBar
        filters={filters} onChange={set} campaigns={campaigns ?? []} hideRange={mode === 'submitted'}
        right={
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList aria-label="상태"><TabsTrigger value="submitted">신청 완료</TabsTrigger><TabsTrigger value="abandoned">작성만 하고 미신청</TabsTrigger></TabsList>
          </Tabs>
        }
      />
      <Card>
        <CardContent className="p-5">
          {mode === 'submitted'
            ? <SubmittedList key={`${filters.campaignId}-${filters.formId}-${filters.channel}`} campaignId={filters.campaignId} formId={filters.formId} channel={filters.channel} />
            : <AbandonedList key={query()} statsQuery={query()} />}
        </CardContent>
      </Card>
    </>
  );
}

