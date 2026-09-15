import { sortJourney } from './journey';

describe('sortJourney', () => {
  it('시각 우선, 동률은 단계 순', () => {
    const t = new Date('2026-09-16T00:00:00Z');
    const later = new Date('2026-09-16T00:00:01Z');
    const out = sortJourney([
      { type: 'SUBMIT_SUCCESS' as const, createdAt: t },
      { type: 'VIEW' as const, createdAt: later },
      { type: 'SUBMIT_ATTEMPT' as const, createdAt: t },
      { type: 'FORM_START' as const, createdAt: t },
    ]);
    expect(out.map((e) => e.type)).toEqual(['FORM_START', 'SUBMIT_ATTEMPT', 'SUBMIT_SUCCESS', 'VIEW']);
  });
});
