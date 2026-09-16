import type { Channel } from '@glowuprizz/shared';
import type { Submission } from './api';

export interface SubmissionPage { total: number; items: Submission[] }

/**
 * 신청 명단 조회 쿼리. 서버 프리페치와 SubmittedList 가 같은 문자열을 만들어야 첫 요청이 중복되지 않는다.
 * ('use client' 모듈의 함수는 서버에서 호출할 수 없어 여기 따로 둔다)
 */
export function submissionsQuery(o: { campaignId?: string; formId?: string; channel?: Channel; page?: number; pageSize?: number }): string {
  const q = new URLSearchParams({ page: String(o.page ?? 1), pageSize: String(o.pageSize ?? 20) });
  if (o.campaignId) q.set('campaignId', o.campaignId);
  if (o.formId) q.set('formId', o.formId);
  if (o.channel) q.set('channel', o.channel);
  return q.toString();
}
