import { Suspense } from 'react';
import { Shell } from '@/components/shell';

/**
 * 관리자 영역 공통 레이아웃. 사이드바(Shell)는 라우트 이동 시 유지되고,
 * useSearchParams 를 쓰는 페이지들을 위한 Suspense 경계도 여기서 한 번만.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <Suspense>{children}</Suspense>
    </Shell>
  );
}
