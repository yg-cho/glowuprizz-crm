import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ErrorText } from '@/components/error-text';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  desc?: string;
  className?: string;
  /** useApi 상태를 넘기면 로딩·에러를 섹션이 대신 표시한다 */
  state?: { loading: boolean; error: string | null };
  children: React.ReactNode;
}

/** 성과 화면의 카드 섹션 공통 틀. 로딩 중에는 내용을 흐리게, 에러는 본문 대신. */
export function Section({ title, desc, className, state, children }: Props) {
  return (
    <Card className={cn(className)} aria-busy={state?.loading || undefined}>
      <CardHeader className="pb-2">
        <h3 className="text-sm font-semibold leading-none">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </CardHeader>
      <CardContent className={cn(state?.loading && 'opacity-50 transition-opacity')}>
        {state?.error ? <ErrorText>{state.error}</ErrorText> : children}
      </CardContent>
    </Card>
  );
}
