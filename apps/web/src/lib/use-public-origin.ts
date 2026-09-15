'use client';

import { useApi } from './use-api';
import type { Link } from './api';

/**
 * 공개 폼 서버 origin. api 가 링크 URL 을 FORMS_PUBLIC_ORIGIN 기준으로 만들어 주므로
 * 아무 링크 하나의 url 에서 origin 을 뽑는다. 링크가 없으면 빈 문자열.
 */
export function usePublicOrigin(formId?: string): string {
  const { data } = useApi<Link[]>(formId ? `/links?formId=${formId}` : null);
  const first = data?.[0];
  return first ? new URL(first.url).origin : '';
}
