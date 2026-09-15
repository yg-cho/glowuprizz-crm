'use client';

import { Button } from '@/components/ui/button';

/** 렌더 중 예외가 나도 빈 화면 대신 복구 버튼. 사이드바는 layout 이 유지한다. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <h1 className="text-lg font-semibold">화면을 표시하지 못했습니다</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message || '알 수 없는 오류'}{error.digest && <span className="block text-xs">ref {error.digest}</span>}</p>
      <Button className="mt-6" variant="outline" onClick={reset}>다시 시도</Button>
    </div>
  );
}
