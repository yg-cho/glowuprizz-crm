/** 화면 표시용 포맷터. 숫자·날짜·라벨을 한곳에서. */

export const pct = (r: number) => `${(r * 100).toFixed(1)}%`;
export const fmtNum = (n: number) => n.toLocaleString('ko-KR');
export const fmtDate = (d: string | Date) => new Date(d).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
export const fmtDay = (d: string | Date) => new Date(d).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
export const fmtTime = (d: string | Date) => new Date(d).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
export const fmtDayTime = (d: string | Date) => new Date(d).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** 초 → "26분", "1시간 3분" */
export const duration = (sec: number) =>
  sec < 60 ? `${sec}초` : sec < 3600 ? `${Math.round(sec / 60)}분` : `${Math.floor(sec / 3600)}시간 ${Math.round((sec % 3600) / 60)}분`;

/** 제출 실패 사유 라벨 (submit_error meta.reason / status) */
const FAILURE_REASON: Record<string, string> = { network: '네트워크 오류', http: '서버 응답 오류', unknown: '기타' };
const FAILURE_STATUS: Record<number, string> = { 400: '필드 검증 400', 403: '폼 일시중지 403', 404: '폼 없음 404', 429: '요청 과다 429' };
export function failureLabel(reason: string, status?: number | null) {
  if (status) return FAILURE_STATUS[status] ?? `${FAILURE_REASON[reason] ?? reason} ${status}`;
  return FAILURE_REASON[reason] ?? reason;
}
/** 짧은 형태 ("네트워크 7, 서버 응답 4") */
export const failureShort = (reason: string) => ({ network: '네트워크', http: '서버 응답', unknown: '기타' })[reason] ?? reason;
