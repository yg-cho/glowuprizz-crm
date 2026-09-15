import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/channel-badge';
import { pct } from '@/lib/format';
import type { FormStats } from '@/lib/api';

/** 같은 캠페인의 폼(템플릿)들을 단계 전환율로 나란히. 2개 이상이면 첫 폼 대비 차이 표시. */
export function FormCompare({ rows }: { rows: FormStats[] | null }) {
  if (rows === null) return <p className="py-6 text-center text-sm text-muted-foreground">불러오는 중…</p>;
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">폼이 없습니다.</p>;
  const base = rows[0];
  const showDiff = rows.length === 2; // 3개 이상이면 '차이' 가 무엇 대비인지 모호
  const stageRows = base.stages.slice(1).map((s, i) => ({ type: s.type, label: `${s.label}`, idx: i + 1 }));
  const diff = (a: number, b: number) => { const d = Math.round((a - b) * 1000) / 10; return d === 0 ? '0' : `${d > 0 ? '+' : ''}${d}`; };
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>단계 전환</TableHead>
          {rows.map((f) => <TableHead key={f.formId} className="text-right"><Link href={`/forms/${f.formId}`} className="hover:underline">{f.name}</Link></TableHead>)}
          {showDiff && <TableHead className="text-right">차이</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="text-muted-foreground">템플릿 · 상태</TableCell>
          {rows.map((f) => <TableCell key={f.formId} className="text-right text-xs text-muted-foreground">{f.template.name} · <StatusBadge status={f.status} /></TableCell>)}
          {showDiff && <TableCell />}
        </TableRow>
        {stageRows.map((s) => (
          <TableRow key={s.type}>
            <TableCell>{s.label}</TableCell>
            {rows.map((f) => <TableCell key={f.formId} className="text-right tabular-nums">{pct(f.stages[s.idx].stepRate)}</TableCell>)}
            {showDiff && <TableCell className="text-right tabular-nums text-muted-foreground">{diff(rows[1].stages[s.idx].stepRate, base.stages[s.idx].stepRate)}</TableCell>}
          </TableRow>
        ))}
        <TableRow>
          <TableCell className="font-medium">클릭→신청</TableCell>
          {rows.map((f) => <TableCell key={f.formId} className="text-right font-medium tabular-nums">{pct(f.overallRate)}</TableCell>)}
          {showDiff && <TableCell className="text-right font-medium tabular-nums">{diff(rows[1].overallRate, base.overallRate)}</TableCell>}
        </TableRow>
      </TableBody>
    </Table>
  );
}
