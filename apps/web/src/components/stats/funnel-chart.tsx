import { cn, pct, fmtNum } from '@/lib/utils';
import type { FunnelSnapshot } from '@/lib/api';

/** 가로 막대 퍼널. 막대 사이 단계 전환율·이탈. 최대 이탈만 색. */
export function FunnelChart({ funnel, failures }: { funnel: FunnelSnapshot; failures?: string }) {
  const first = funnel.stages[0]?.visitors || 0;
  return (
    <div>
      {funnel.stages.map((s, i) => {
        const width = first === 0 ? 0 : Math.max(2, (s.visitors / first) * 100);
        const isMaxDrop = funnel.maxDropStage === s.type;
        return (
          <div key={s.type}>
            {i > 0 && (
              <div className={cn('ml-[112px] flex gap-4 text-xs', isMaxDrop ? 'text-destructive' : 'text-muted-foreground')}>
                <span>{pct(s.stepRate)}{isMaxDrop && ' · 최대 이탈'}</span>
                <span>{s.type === 'SUBMIT_SUCCESS' ? <>실패 {funnel.submitErrors}{failures && ` · ${failures}`}</> : <>이탈 {fmtNum(s.dropoff)}</>}</span>
              </div>
            )}
            <div className="my-2 grid grid-cols-[100px_1fr_72px] items-center gap-3 text-sm">
              <span>{s.label}</span>
              <div className="h-6 rounded bg-primary pl-2 text-xs leading-6 text-primary-foreground tabular-nums" style={{ width: `${width}%`, minWidth: 36 }}>{fmtNum(s.visitors)}</div>
              <span className="text-right text-sm tabular-nums"><b className="font-medium">{pct(s.cumulativeRate)}</b></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
