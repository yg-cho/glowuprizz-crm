import { emptyGroup, funnelSnapshot, kstDay, maxDropStage, rate, stageList } from './metrics';

describe('metrics', () => {
  it('rate: 분모 0 은 0, 소수 4자리', () => {
    expect(rate(1, 0)).toBe(0);
    expect(rate(1, 3)).toBe(0.3333);
    expect(rate(2, 2)).toBe(1);
  });

  it('stageList: 단계 전환·누적·이탈', () => {
    const list = stageList({ VIEW: 100, FORM_VIEW: 80, FORM_START: 40, SUBMIT_ATTEMPT: 30, SUBMIT_SUCCESS: 27 });
    expect(list.map((s) => s.type)).toEqual(['VIEW', 'FORM_VIEW', 'FORM_START', 'SUBMIT_ATTEMPT', 'SUBMIT_SUCCESS']);
    expect(list[0]).toMatchObject({ label: '링크 클릭', stepRate: 1, cumulativeRate: 1, dropoff: 0 });
    expect(list[1]).toMatchObject({ stepRate: 0.8, cumulativeRate: 0.8, dropoff: 20 });
    expect(list[2]).toMatchObject({ stepRate: 0.5, cumulativeRate: 0.4, dropoff: 40 });
    expect(list[4]).toMatchObject({ stepRate: 0.9, cumulativeRate: 0.27, dropoff: 3 });
  });

  it('stageList: 다음 단계가 더 크면 이탈은 0 (이관 데이터 등)', () => {
    const list = stageList({ VIEW: 1, FORM_VIEW: 0, FORM_START: 0, SUBMIT_ATTEMPT: 0, SUBMIT_SUCCESS: 2 });
    expect(list[4].dropoff).toBe(0);
  });

  it('maxDropStage: 최대 이탈 단계, 이탈 없으면 null', () => {
    expect(maxDropStage(stageList({ VIEW: 100, FORM_VIEW: 80, FORM_START: 40, SUBMIT_ATTEMPT: 30, SUBMIT_SUCCESS: 27 }))).toBe('FORM_START');
    expect(maxDropStage(stageList({ VIEW: 0, FORM_VIEW: 0, FORM_START: 0, SUBMIT_ATTEMPT: 0, SUBMIT_SUCCESS: 0 }))).toBeNull();
    expect(maxDropStage([])).toBeNull();
  });

  it('funnelSnapshot: 빈 그룹', () => {
    expect(funnelSnapshot(emptyGroup())).toMatchObject({ pageViews: 0, submitErrors: 0, overallRate: 0, maxDropStage: null });
  });

  it('kstDay: UTC 15:00 = KST 다음날 00:00', () => {
    expect(kstDay(new Date('2026-09-14T15:00:00Z'))).toBe('2026-09-15');
    expect(kstDay(new Date('2026-09-14T14:59:59Z'))).toBe('2026-09-14');
  });
});
