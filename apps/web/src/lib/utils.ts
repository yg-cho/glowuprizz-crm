export { cn } from 'cn';

export const pct = (r: number) => `${(r * 100).toFixed(1)}%`;
export const fmtDate = (d: string | Date) => new Date(d).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
export const fmtNum = (n: number) => n.toLocaleString('ko-KR');
export const fmtDay = (d: string | Date) => new Date(d).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
