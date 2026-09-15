'use client';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401 && typeof window !== 'undefined' && !location.pathname.startsWith('/login')) {
    location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = Array.isArray(body.message) ? body.message.join(', ') : body.message ?? msg;
    } catch {}
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const base = '/api';

export const api = {
  get: <T>(path: string) => fetch(base + path, { credentials: 'include', cache: 'no-store' }).then(handle<T>),
  post: <T>(path: string, body?: unknown) =>
    fetch(base + path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then(handle<T>),
  patch: <T>(path: string, body: unknown) =>
    fetch(base + path, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handle<T>),
  del: (path: string) => fetch(base + path, { method: 'DELETE', credentials: 'include' }).then(handle<void>),
  upload: <T>(path: string, form: FormData) =>
    fetch(base + path, { method: 'POST', credentials: 'include', body: form }).then(handle<T>),
};

// ---- types (api 응답 형태)
export type Channel = 'INSTAGRAM' | 'X' | 'YOUTUBE' | 'THREADS';
export interface Template { id: string; name: string; sizeBytes: number; createdAt: string; _count?: { forms: number }; html?: string }
export interface Campaign { id: string; name: string; description?: string | null; createdAt: string; _count?: { forms: number }; forms?: FormRow[] }
export interface FormRow {
  id: string; name: string; slug: string; status: 'ACTIVE' | 'PAUSED'; createdAt: string;
  campaign?: { id: string; name: string }; template?: { id: string; name: string };
  _count?: { links: number; submissions: number }; links?: Link[];
}
export interface Link { id: string; formId: string; channel: Channel; code: string; url: string; createdAt: string }
export interface Submission {
  id: string; createdAt: string; payload: Record<string, string | string[]>;
  form: { id: string; name: string; slug: string; campaign: { id: string; name: string } };
  link: { id: string; channel: Channel; code: string } | null;
}
// ---- 성과 (apps/api stats) — 단계 수는 고유 방문자 기준
export type Stage = 'VIEW' | 'FORM_VIEW' | 'FORM_START' | 'SUBMIT_ATTEMPT' | 'SUBMIT_SUCCESS';
export const STAGES: Stage[] = ['VIEW', 'FORM_VIEW', 'FORM_START', 'SUBMIT_ATTEMPT', 'SUBMIT_SUCCESS'];
export const STAGE_LABELS: Record<Stage, string> = { VIEW: '링크 클릭', FORM_VIEW: '폼 도달', FORM_START: '작성 시작', SUBMIT_ATTEMPT: '제출 시도', SUBMIT_SUCCESS: '신청 완료' };
export type StageCounts = Record<Stage, number>;

export interface FunnelStage { type: Stage; label: string; visitors: number; stepRate: number; cumulativeRate: number; dropoff: number }
export interface FunnelSnapshot { stages: FunnelStage[]; pageViews: number; submitErrors: number; overallRate: number; maxDropStage: Stage | null }
export interface Funnel { range: string; period: { from: string | null; to: string | null }; current: FunnelSnapshot; previous: (FunnelSnapshot & { period: { from: string; to: string } }) | null }
export interface TimeseriesPoint { day: string; visitors: number; formStarts: number; submissions: number; conversionRate: number }
export interface ChannelStats extends StageCounts { channel: Channel; pageViews: number; submitErrors: number; clickToSubmit: number; startToSubmit: number; share: number }
export interface CampaignStats extends StageCounts { campaignId: string; campaignName: string; createdAt: string; formsCount: number; linksCount: number; pageViews: number; conversionRate: number }
export interface LinkStats extends StageCounts { linkId: string; channel: Channel; code: string; createdAt: string; form: { id: string; name: string; slug: string }; pageViews: number; conversionRate: number }
export interface FormStats { formId: string; name: string; slug: string; status: 'ACTIVE' | 'PAUSED'; template: { id: string; name: string }; stages: FunnelStage[]; overallRate: number }
export interface Heatmap { grid: number[][]; max: number }
export interface Failure { reason: string; status: number | null; count: number }
export interface Quality { submittersOnce: number; submittersMulti: number; onceRate: number; multiRate: number; avgVisitsPerSubmitter: number; duplicatePhones: number; suspectedBots: number; suspectedBotRate: number }
export interface Insight { level: 'warn' | 'info'; text: string }
export interface JourneyEvent { id: string; type: Stage | 'SUBMIT_ERROR'; meta: Record<string, unknown> | null; createdAt: string; link: { id: string; channel: Channel; code: string } | null }
export interface VisitorRow { visitorId: string; formId: string; firstSeen: string; lastSeen: string; views: number; lastChannel: Channel | null; lastStage: string; journey: JourneyEvent[] }
export interface Journey { submission: { id: string; formId: string; visitorId: string | null; createdAt: string; link: { id: string; channel: Channel; code: string } | null }; events: JourneyEvent[]; visits: number; secondsToSubmit: number }
export interface Overview { visits: number; visitors: number; submissions: number; campaigns: number; forms: number; conversionRate: number }
