import { BadRequestException } from '@nestjs/common';
import { resolvePeriod } from './period';

describe('resolvePeriod', () => {
  const now = new Date('2026-09-16T05:00:00Z'); // KST 14:00

  it('7d: KST 자정 정렬, 오늘 포함 7일, 기본값', () => {
    const r = resolvePeriod({}, now);
    expect(r.range).toBe('7d');
    expect(r.current.to?.toISOString()).toBe('2026-09-16T15:00:00.000Z'); // KST 9/17 00:00
    expect(r.current.from?.toISOString()).toBe('2026-09-09T15:00:00.000Z'); // KST 9/10 00:00
    expect(r.previous).toBeNull();
  });

  it('today 는 하루, compare 면 직전 같은 길이', () => {
    const r = resolvePeriod({ range: 'today', compare: true }, now);
    expect(r.current.from?.toISOString()).toBe('2026-09-15T15:00:00.000Z');
    expect(r.previous?.from?.toISOString()).toBe('2026-09-14T15:00:00.000Z');
    expect(r.previous?.to?.toISOString()).toBe('2026-09-15T15:00:00.000Z');
  });

  it('all 은 무제한이고 compare 무시', () => {
    const r = resolvePeriod({ range: 'all', compare: true }, now);
    expect(r.current).toEqual({ from: null, to: null });
    expect(r.previous).toBeNull();
  });

  it('custom: from/to 그대로, from 만 있어도 됨, 역순은 400', () => {
    const r = resolvePeriod({ from: '2026-09-01T00:00:00+09:00', to: '2026-09-08T00:00:00+09:00' }, now);
    expect(r.range).toBe('custom');
    expect(r.current.from?.toISOString()).toBe('2026-08-31T15:00:00.000Z');
    expect(resolvePeriod({ range: 'custom', from: '2026-09-01' }, now).current.to).toBeNull();
    expect(() => resolvePeriod({ range: 'custom', from: '2026-09-08', to: '2026-09-01' }, now)).toThrow(BadRequestException);
    expect(() => resolvePeriod({ range: 'custom', from: 'nope' }, now)).toThrow(BadRequestException);
  });
});
