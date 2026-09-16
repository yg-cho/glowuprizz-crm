import { serverGet } from '@/lib/api-server';
import { parseStatsFilters, toParams } from '@/lib/stats-query';
import { submissionsQuery, type SubmissionPage } from '@/lib/submissions-query';
import type { Campaign } from '@/lib/api';
import { SubmissionsView } from './view';

/** 첫 화면에 보이는 것(캠페인 선택지 + 신청 완료 명단 1쪽)만 서버에서 받아둔다. */
export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = parseStatsFilters(toParams(await searchParams), { range: 'all' });
  const [campaigns, submissions] = await Promise.all([
    serverGet<Campaign[]>('/campaigns'),
    serverGet<SubmissionPage>(`/submissions?${submissionsQuery({ campaignId: f.campaignId, formId: f.formId, channel: f.channel })}`),
  ]);
  return <SubmissionsView initialCampaigns={campaigns} initialSubmissions={submissions} />;
}
