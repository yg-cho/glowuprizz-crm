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
export interface CampaignStats { campaignId: string; campaignName: string; visits: number; visitors: number; submissions: number; conversionRate: number }
export interface ChannelStats { channel: Channel; visits: number; visitors: number; submissions: number; conversionRate: number }
export interface Overview { visits: number; visitors: number; submissions: number; campaigns: number; forms: number; conversionRate: number }
