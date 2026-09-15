import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn, pct, fmtNum } from '@/lib/utils';
import type { FunnelSnapshot } from '@/lib/api';

/** 5단계 KPI 카드. 최대 이탈 구간 하나만 색으로 표시. */
export function StageCards({ funnel, previous }: { funnel: FunnelSnapshot; previous?: FunnelSnapshot | null }) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
      {funnel.stages.map((s, i) => {
        const prev = previous?.stages[i];
        const delta = prev && prev.visitors > 0 ? (s.visitors - prev.visitors) / prev.visitors : null;
        const isMaxDrop = funnel.maxDropStage === s.type;
        return (
          <Card key={s.type} className="relative">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{s.label}{i === 0 && ' · 방문자'}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{fmtNum(s.visitors)}</div>
              <div className="text-xs text-muted-foreground">
                {i === 0
                  ? <>페이지뷰 <b className="font-medium text-foreground">{fmtNum(funnel.pageViews)}</b>{s.visitors > 0 && <> · 1인당 {(funnel.pageViews / s.visitors).toFixed(1)}회</>}</>
                  : <>전환 <b className="font-medium text-foreground">{pct(s.stepRate)}</b>{s.type === 'SUBMIT_SUCCESS' && funnel.submitErrors > 0 && <> · 실패 {funnel.submitErrors}</>}</>}
              </div>
              <div className={cn('mt-2 text-xs', isMaxDrop ? 'text-destructive' : 'text-muted-foreground')}>
                {i === 0
                  ? delta === null ? (previous ? '이전 기간 0' : ' ') : `이전 기간 대비 ${delta >= 0 ? '+' : ''}${Math.round(delta * 100)}%`
                  : s.type === 'SUBMIT_SUCCESS' ? <>전체 전환 <b className="font-medium text-foreground">{pct(funnel.overallRate)}</b></>
                  : <>이탈 {fmtNum(s.dropoff)}{isMaxDrop && ' · 최대 이탈 구간'}</>}
              </div>
            </CardContent>
            {i < funnel.stages.length - 1 && <ChevronRight className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-border lg:block" />}
          </Card>
        );
      })}
    </div>
  );
}
