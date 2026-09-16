import { serverGet } from '@/lib/api-server';
import { submissionsQuery, type SubmissionPage } from '@/lib/submissions-query';
import type { FormRow, LinkStats } from '@/lib/api';
import { FormDetailView } from './view';

/** 폼 정보 · 배포 링크 · 신청 명단 1쪽을 서버에서 한 번에 받아 첫 화면부터 채워 보낸다. */
export default async function FormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [form, links, submissions, config] = await Promise.all([
    serverGet<FormRow>(`/forms/${id}`),
    serverGet<LinkStats[]>(`/stats/links?range=all&formId=${id}`),
    serverGet<SubmissionPage>(`/submissions?${submissionsQuery({ formId: id })}`),
    serverGet<{ formsPublicOrigin: string }>('/config'),
  ]);
  return <FormDetailView id={id} initial={{ form, links, submissions, publicOrigin: config?.formsPublicOrigin ?? null }} />;
}
