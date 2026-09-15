import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { pct, fmtNum } from '@/lib/utils';
import type { Failure, Quality } from '@/lib/api';

const REASON: Record<string, string> = { network: '네트워크 오류', http: '서버 응답 오류', unknown: '기타' };
const STATUS: Record<number, string> = { 400: '필드 검증 400', 403: '폼 일시중지 403', 404: '폼 없음 404', 429: '요청 과다 429' };

/** 제출 실패 사유 표 */
export function FailuresTable({ rows }: { rows: Failure[] }) {
  if (rows.length === 0) return <p className="py-4 text-sm text-muted-foreground">실패 없음</p>;
  return (
    <Table>
      <TableBody>
        {rows.map((f, i) => (
          <TableRow key={i}>
            <TableCell>{f.status ? STATUS[f.status] ?? `${REASON[f.reason] ?? f.reason} ${f.status}` : REASON[f.reason] ?? f.reason}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtNum(f.count)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** 방문자 품질: 재방문·중복·봇 */
export function QualityList({ q }: { q: Quality }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">1회 방문 후 신청</dt><dd className="tabular-nums">{pct(q.onceRate)}</dd>
      <dt className="text-muted-foreground">2회 이상 방문 후 신청</dt><dd className="tabular-nums">{pct(q.multiRate)} <span className="text-xs text-muted-foreground">평균 {q.avgVisitsPerSubmitter}회</span></dd>
      <dt className="text-muted-foreground">같은 전화번호 중복</dt><dd className="tabular-nums">{fmtNum(q.duplicatePhones)}건</dd>
      <dt className="text-muted-foreground">봇 의심</dt><dd className="tabular-nums">{pct(q.suspectedBotRate)} <span className="text-xs text-muted-foreground">폼 도달 없이 이탈 {fmtNum(q.suspectedBots)}</span></dd>
    </dl>
  );
}
