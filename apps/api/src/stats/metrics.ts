import { STAGES, STAGE_LABELS, Stage, StageCounts, FunnelStage } from '@glowuprizz/shared';
import { KST_OFFSET_MS } from './period';

/** n/d 를 소수 4자리 비율로. 분모 0 이면 0. */
export const rate = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 10000) / 10000);
export const num = (v: unknown) => Number(v ?? 0);
const emptyStages = (): StageCounts => ({ VIEW: 0, FORM_VIEW: 0, FORM_START: 0, SUBMIT_ATTEMPT: 0, SUBMIT_SUCCESS: 0 });

/** 한 그룹(전체/채널/캠페인/…)의 단계별 집계 결과 */
export interface StageGroup {
  /** 단계별 고유 방문자 */
  stages: StageCounts;
  /** 단계별 이벤트 수 (VIEW = 페이지뷰) */
  events: StageCounts;
  /** SUBMIT_ERROR 이벤트 수 */
  errors: number;
}
export const emptyGroup = (): StageGroup => ({ stages: emptyStages(), events: emptyStages(), errors: 0 });

/** 단계 수 → 단계 전환율·누적 전환율·이탈 */
export function stageList(stages: StageCounts): FunnelStage[] {
  const first = stages.VIEW;
  return STAGES.map((type, i) => {
    const prev = i === 0 ? null : stages[STAGES[i - 1]];
    return {
      type,
      label: STAGE_LABELS[type],
      visitors: stages[type],
      stepRate: prev === null ? 1 : rate(stages[type], prev),
      cumulativeRate: rate(stages[type], first),
      dropoff: prev === null ? 0 : Math.max(0, prev - stages[type]),
    };
  });
}

/** 이탈이 가장 큰 단계(첫 단계 제외). 이탈 0 이면 null. */
export function maxDropStage(stages: FunnelStage[]): Stage | null {
  const drops = stages.slice(1);
  if (!drops.length) return null;
  const max = drops.reduce((a, b) => (b.dropoff > a.dropoff ? b : a));
  return max.dropoff > 0 ? max.type : null;
}

/** 퍼널 스냅샷 (대시보드 카드·퍼널 차트가 쓰는 형태) */
export function funnelSnapshot(g: StageGroup) {
  const stages = stageList(g.stages);
  return {
    stages,
    pageViews: g.events.VIEW,
    submitErrors: g.errors,
    overallRate: rate(g.stages.SUBMIT_SUCCESS, g.stages.VIEW),
    maxDropStage: maxDropStage(stages),
  };
}

/** UTC Date → KST 날짜 문자열 (YYYY-MM-DD) */
export const kstDay = (d: Date) => new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
