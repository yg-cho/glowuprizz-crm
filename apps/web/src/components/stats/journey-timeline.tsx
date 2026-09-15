import { CHANNEL_LABELS, EVENT_LABELS as LABEL, STAGES as ORDER, type Channel, type Stage } from '@glowuprizz/shared';
import { cn } from '@/lib/utils';
import { fmtDayTime, fmtTime } from '@/lib/format';
import type { JourneyEvent } from '@/lib/api';
const REASON: Record<string, string> = { network: '네트워크', http: '서버 응답' };


/**
 * 방문자 이벤트를 가로 타임라인으로. 재방문(VIEW 반복)은 '재방문'으로, 마지막 도달 단계 뒤에는 도달 못 한 단계를 빈 원으로 붙인다.
 */
export function JourneyTimeline({ events }: { events: JourneyEvent[] }) {
  if (events.length === 0) return <p className="text-xs text-muted-foreground">방문자 쿠키 없이 제출되어 여정이 없습니다.</p>;
  type Item = { key: string; label: string; sub: string; kind: 'done' | 'miss' | 'error' | 'success' };
  const items: Item[] = [];
  let views = 0;
  let prevDay = '';
  for (const e of events) {
    const day = e.createdAt.slice(0, 10);
    const t = day !== prevDay ? fmtDayTime(e.createdAt) : fmtTime(e.createdAt);
    prevDay = day;
    if (e.type === 'VIEW') {
      views += 1;
      // 이전 방문에서 작성 없이 끝났으면 '이탈' 표시
      const last = items[items.length - 1];
      if (views > 1 && last && (last.label === '폼 도달' || last.label === '링크 클릭')) items.push({ key: `miss${views}`, label: '이탈', sub: '작성 없이 닫음', kind: 'miss' });
      items.push({ key: e.id, label: views === 1 ? '링크 클릭' : '재방문', sub: t + (e.link ? ` · ${CHANNEL_LABELS[e.link.channel as Channel]}` : ''), kind: 'done' });
    } else if (e.type === 'SUBMIT_ERROR') {
      const m = (e.meta ?? {}) as { reason?: string; status?: number };
      items.push({ key: e.id, label: '제출 실패', sub: `${t} · ${REASON[m.reason ?? ''] ?? m.reason ?? ''}${m.status ? ` ${m.status}` : ''}`, kind: 'error' });
    } else if (e.type === 'SUBMIT_ATTEMPT' && items.some((i) => i.label === '제출 실패')) {
      items.push({ key: e.id, label: '재시도', sub: t, kind: 'done' });
    } else {
      const m = (e.meta ?? {}) as { field?: string };
      items.push({ key: e.id, label: LABEL[e.type], sub: t + (e.type === 'FORM_START' && m.field ? ` · ${m.field}` : ''), kind: e.type === 'SUBMIT_SUCCESS' ? 'success' : 'done' });
    }
  }
  // 도달 못 한 단계
  const reached = new Set(events.map((e) => e.type));
  const lastIdx = ORDER.reduce((acc, s, i) => (reached.has(s) ? i : acc), -1);
  const next = ORDER[lastIdx + 1];
  if (next && !reached.has('SUBMIT_SUCCESS')) items.push({ key: 'next', label: `${LABEL[next]} 없음`, sub: hintFor(next, events), kind: 'miss' });

  return (
    <ol className="flex overflow-x-auto">
      {items.map((it, i) => (
        <li key={it.key} className="relative min-w-[120px] flex-1 py-1 pl-4 pr-2 text-xs">
          <span className={cn('absolute left-1 top-[9px] block h-2 w-2 rounded-full',
            it.kind === 'done' && 'bg-foreground', it.kind === 'success' && 'bg-foreground', it.kind === 'error' && 'bg-destructive', it.kind === 'miss' && 'border border-border bg-card')} />
          {i < items.length - 1 && <span className="absolute left-3 right-0 top-[12.5px] h-px bg-border" />}
          <div className={cn(it.kind === 'miss' && 'text-muted-foreground', it.kind === 'success' && 'font-medium')}>{it.label}</div>
          <div className="mt-0.5 text-muted-foreground">{it.sub}</div>
        </li>
      ))}
    </ol>
  );
}

function hintFor(next: Stage, events: JourneyEvent[]) {
  if (next === 'FORM_VIEW') return '스크립트 실행 전 이탈 · 봇 가능';
  if (next === 'FORM_START') return '폼은 봤지만 입력 없음';
  if (next === 'SUBMIT_ATTEMPT') {
    const f = (events.find((e) => e.type === 'FORM_START')?.meta as { field?: string } | null)?.field;
    return f ? `${f} 입력 후 멈춤` : '입력 중 멈춤';
  }
  return '제출은 했지만 완료되지 않음';
}
