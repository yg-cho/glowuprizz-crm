import { useApi } from './use-api';

/** 공개 폼 서버 origin — 서버 설정(GET /config)에서. initial 은 서버 컴포넌트가 미리 받아둔 값. */
export function usePublicOrigin(initial?: string | null): string {
  const { data } = useApi<{ formsPublicOrigin: string }>('/config', initial ? { formsPublicOrigin: initial } : null);
  return data?.formsPublicOrigin ?? '';
}
