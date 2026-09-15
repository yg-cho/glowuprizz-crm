import { BadRequestException } from '@nestjs/common';
import { Range } from './dto/stats-query.dto';

export interface Period { from: Date | null; to: Date | null }
export interface ResolvedPeriod { range: Range; current: Period; previous: Period | null }

export const DAY_MS = 86_400_000;
const DAY = DAY_MS;
export const KST_OFFSET_MS = 9 * 3_600_000;
const KST_OFFSET = KST_OFFSET_MS;

/** 날짜만 온 값(YYYY-MM-DD)은 KST 자정으로, 시각이 있으면 그대로 */
function parseBoundary(v: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00+09:00`) : new Date(v);
}

/** KST 자정 기준 하루 시작 (UTC Date) */
export function startOfKstDay(d: Date): Date {
  const kst = new Date(d.getTime() + KST_OFFSET);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - KST_OFFSET);
}

/**
 * range → [from, to) 구간. 'all' 은 무제한(null). compare 면 같은 길이의 직전 구간도 계산.
 * 오늘/7d/30d/90d 는 KST 자정 정렬, 끝은 내일 자정(오늘 포함).
 */
export function resolvePeriod(q: { range?: Range; from?: string; to?: string; compare?: boolean }, now = new Date()): ResolvedPeriod {
  const range: Range = q.range ?? (q.from || q.to ? 'custom' : '7d');
  let current: Period;
  if (range === 'all') current = { from: null, to: null };
  else if (range === 'custom') {
    const from = q.from ? parseBoundary(q.from) : null;
    const to = q.to ? parseBoundary(q.to) : null;
    if ((from && isNaN(+from)) || (to && isNaN(+to))) throw new BadRequestException('invalid from/to');
    if (from && to && from >= to) throw new BadRequestException('from must be before to');
    current = { from, to };
  } else {
    const days = range === 'today' ? 1 : Number(range.replace('d', ''));
    const to = new Date(startOfKstDay(now).getTime() + DAY);
    current = { from: new Date(to.getTime() - days * DAY), to };
  }
  let previous: Period | null = null;
  if (q.compare && current.from && current.to) {
    const len = current.to.getTime() - current.from.getTime();
    previous = { from: new Date(current.from.getTime() - len), to: current.from };
  }
  return { range, current, previous };
}
