import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChannelBadge } from '@/components/channel-badge';
import { ShareBar } from './share-bar';
import { cn, pct, fmtNum } from '@/lib/utils';
import type { ChannelStats } from '@/lib/api';

/** 채널별 단계 수를 나란히. 표본 있는 채널 중 클릭→신청 최저만 색. */
export function ChannelTable({ rows }: { rows: ChannelStats[] }) {
  const withData = rows.filter((r) => r.VIEW >= 10);
  const worst = withData.length >= 2 ? withData.reduce((a, b) => (b.clickToSubmit < a.clickToSubmit ? b : a)).channel : null;
  const sub = (n: number, d: number) => d > 0 ? <span className="ml-1 text-xs text-muted-foreground">{Math.round((n / d) * 100)}%</span> : null;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>채널</TableHead><TableHead className="text-right">클릭</TableHead><TableHead className="text-right">폼 도달</TableHead>
          <TableHead className="text-right">작성 시작</TableHead><TableHead className="text-right">신청</TableHead>
          <TableHead className="text-right">클릭→신청</TableHead><TableHead className="text-right">작성→신청</TableHead><TableHead>신청 기여</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.channel}>
            <TableCell><ChannelBadge channel={r.channel} /></TableCell>
            <TableCell className="text-right tabular-nums">{fmtNum(r.VIEW)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtNum(r.FORM_VIEW)}{sub(r.FORM_VIEW, r.VIEW)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtNum(r.FORM_START)}{sub(r.FORM_START, r.FORM_VIEW)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtNum(r.SUBMIT_SUCCESS)}</TableCell>
            <TableCell className={cn('text-right tabular-nums', worst === r.channel && 'text-destructive')}>{pct(r.clickToSubmit)}</TableCell>
            <TableCell className="text-right tabular-nums">{pct(r.startToSubmit)}</TableCell>
            <TableCell><ShareBar value={r.share} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
