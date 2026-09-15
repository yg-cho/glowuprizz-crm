import { useApi } from './use-api';

/** 공개 폼 서버 origin — 서버 설정(GET /config)에서. 로드 전에는 빈 문자열. */
export function usePublicOrigin(): string {
  const { data } = useApi<{ formsPublicOrigin: string }>('/config');
  return data?.formsPublicOrigin ?? '';
}
