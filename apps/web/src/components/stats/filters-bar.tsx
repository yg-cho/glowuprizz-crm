'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RANGES, type Range, type StatsFilters } from '@/lib/stats-filters';
import { CHANNEL_OPTIONS, type Channel } from '@glowuprizz/shared';
import type { Campaign } from '@/lib/api';

interface Props {
  filters: StatsFilters;
  onChange: (patch: Partial<StatsFilters>) => void;
  campaigns?: Campaign[];        // 주면 캠페인 선택 노출
  hideCampaign?: boolean;
  hideChannel?: boolean;
  right?: React.ReactNode;
}

/** 기간 · 캠페인 · 채널 · 비교. 모든 성과 화면 상단에 동일하게. */
export function FiltersBar({ filters, onChange, campaigns, hideCampaign, hideChannel, right }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Tabs value={filters.range} onValueChange={(v) => onChange({ range: v as Range })}>
        <TabsList aria-label="기간">
          {RANGES.map((r) => <TabsTrigger key={r.value} value={r.value}>{r.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      <div className="flex-1" />
      {!hideCampaign && campaigns && (
        <Select value={filters.campaignId ?? 'all'} onValueChange={(v) => onChange({ campaignId: v === 'all' ? undefined : v, formId: undefined })}>
          <SelectTrigger className="w-44" aria-label="캠페인"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 캠페인</SelectItem>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {!hideChannel && (
        <Select value={filters.channel ?? 'all'} onValueChange={(v) => onChange({ channel: v === 'all' ? undefined : (v as Channel) })}>
          <SelectTrigger className="w-36" aria-label="채널"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 채널</SelectItem>
            {CHANNEL_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {filters.range !== 'all' && (
        <Select value={filters.compare ? 'prev' : 'none'} onValueChange={(v) => onChange({ compare: v === 'prev' })}>
          <SelectTrigger className="w-40" aria-label="비교"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="prev">비교: 이전 기간</SelectItem>
            <SelectItem value="none">비교 없음</SelectItem>
          </SelectContent>
        </Select>
      )}
      {right}
    </div>
  );
}
